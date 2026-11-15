// Dosya servisi: şifreleme modülü + MinIO depolama + files tablosunu birleştirir.
//
//   Yükleme : dosya -> AES-128-GCM (DEK) -> MinIO'ya şifreli yaz -> files tablosuna kayıt
//   İndirme : files kaydı -> MinIO'dan şifreli oku -> DEK'i KEK ile aç -> dosyayı çöz
//
// Bağımlılıklar dışarıdan verilir (storage, db, kek); böylece testlerde sahte
// depolama ve sahte veritabanı kullanılabilir, gerçek sistemde pg Pool ve MinIO.

const crypto = require('crypto');
const { encryptFile, decryptFile } = require('../crypto/encryption');

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB (dosya bellekte şifrelendiği için sınırlı)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class FileServiceError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'FileServiceError';
    this.status = status; // HTTP durum kodu (endpoint katmanı bunu kullanacak)
    this.code = code;
  }
}

function createFileService({ storage, db, kek, maxBytes = DEFAULT_MAX_BYTES }) {
  if (!storage || !db || !kek) throw new Error('storage, db ve kek gerekli.');

  const makeAad = (fileId, ownerId) => Buffer.from(`${fileId}:${ownerId}`);

  return {
    /**
     * Dosyayı şifreleyip MinIO'ya yazar ve files tablosuna kaydeder.
     * @returns {{id, originalName, mimeType, sizeBytes, createdAt}}
     */
    async uploadFile({ ownerId, originalName, mimeType, buffer }) {
      if (!ownerId) throw new FileServiceError('ownerId gerekli.', 400, 'OWNER_REQUIRED');
      if (!originalName) throw new FileServiceError('Dosya adı gerekli.', 400, 'NAME_REQUIRED');
      if (!Buffer.isBuffer(buffer)) throw new FileServiceError('Dosya içeriği gerekli.', 400, 'BODY_REQUIRED');
      if (buffer.length > maxBytes) {
        throw new FileServiceError('Dosya çok büyük.', 413, 'FILE_TOO_LARGE');
      }

      const fileId = crypto.randomUUID();
      const objectKey = `${ownerId}/${fileId}`;
      const aad = makeAad(fileId, ownerId);
      const enc = encryptFile(buffer, kek, aad);

      // 1) Önce şifreli veriyi depola
      await storage.put(objectKey, enc.encryptedData);

      // 2) Sonra kaydı yaz; başarısız olursa depoda yetim nesne kalmasın
      try {
        const res = await db.query(
          `INSERT INTO files
             (id, owner_id, original_name, object_key, mime_type, size_bytes,
              encrypted_dek, nonce, aad, encryption_algorithm)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING id, original_name, mime_type, size_bytes, created_at`,
          [fileId, ownerId, String(originalName).slice(0, 255), objectKey, mimeType || null,
           buffer.length, enc.encryptedDek, enc.nonce, aad, enc.algorithm]
        );
        const row = res.rows[0];
        return {
          id: row.id,
          originalName: row.original_name,
          mimeType: row.mime_type,
          sizeBytes: Number(row.size_bytes),
          createdAt: row.created_at,
        };
      } catch (err) {
        await storage.remove(objectKey).catch(() => {});
        throw err;
      }
    },

    /**
     * Dosyayı MinIO'dan çekip çözer. Şimdilik yalnızca dosya sahibi indirebilir;
     * file_permissions tablosuyla izin kontrolü sonraki adımda eklenecek.
     * @returns {{buffer, originalName, mimeType}}
     */
    async downloadFile({ fileId, requesterId }) {
      if (!UUID_RE.test(String(fileId))) {
        throw new FileServiceError('Dosya bulunamadı.', 404, 'NOT_FOUND');
      }
      const res = await db.query(
        `SELECT id, owner_id, original_name, object_key, mime_type, size_bytes,
                encrypted_dek, nonce, aad, encryption_algorithm
           FROM files WHERE id = $1`,
        [fileId]
      );
      const row = res.rows[0];
      if (!row) throw new FileServiceError('Dosya bulunamadı.', 404, 'NOT_FOUND');
      if (row.owner_id !== requesterId) {
        throw new FileServiceError('Bu dosyaya erişim yetkiniz yok.', 403, 'FORBIDDEN');
      }

      // Kayıttaki AAD, dosya kimliği ve sahibiyle uyuşmuyorsa kayıt oynanmış demektir
      const expectedAad = makeAad(row.id, row.owner_id);
      if (!row.aad || !Buffer.from(row.aad).equals(expectedAad)) {
        throw new FileServiceError('Dosya kaydı bütünlük kontrolünden geçemedi.', 500, 'INTEGRITY_ERROR');
      }

      const encryptedData = await storage.get(row.object_key);
      let buffer;
      try {
        buffer = decryptFile({
          encryptedData,
          encryptedDek: Buffer.from(row.encrypted_dek),
          nonce: Buffer.from(row.nonce),
          aad: expectedAad,
        }, kek);
      } catch {
        throw new FileServiceError('Dosya çözülemedi (veri bozulmuş olabilir).', 500, 'DECRYPT_FAILED');
      }
      return { buffer, originalName: row.original_name, mimeType: row.mime_type };
    },
  };
}

module.exports = { createFileService, FileServiceError, DEFAULT_MAX_BYTES };
