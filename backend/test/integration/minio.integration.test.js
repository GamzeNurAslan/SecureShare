// GERÇEK MinIO'ya karşı uçtan uca test: şifrele -> MinIO'ya yaz -> geri çek -> çöz.
//
// MinIO çalışmıyorsa ya da .env içinde MinIO bilgileri yoksa test KENDİLİĞİNDEN ATLANIR,
// bu yüzden `npm test` her ortamda güvenle çalışır.
// Gerçek çalıştırma: Docker'da MinIO açıkken `cd backend && npm test`.
//
// Veritabanı için sahte (bellek içi) bir db kullanılır; PostgreSQL gerekmez.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { createMinioClientFromEnv, createStorage } = require('../../storage/minioStorage');
const { createFileService } = require('../../services/fileService');

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('zaman aşımı')), ms))]);

function memoryDb() {
  const rows = new Map();
  return {
    async query(text, p) {
      if (text.includes('INSERT INTO files')) {
        const row = {
          id: p[0], owner_id: p[1], original_name: p[2], object_key: p[3], mime_type: p[4],
          size_bytes: p[5], encrypted_dek: p[6], nonce: p[7], aad: p[8],
          encryption_algorithm: p[9], created_at: new Date(),
        };
        rows.set(row.id, row);
        return { rows: [row] };
      }
      return { rows: rows.has(p[0]) ? [rows.get(p[0])] : [] };
    },
    rows,
  };
}

test('MinIO entegrasyonu: şifreli yaz, geri çek, çöz', async (t) => {
  if (!process.env.MINIO_ROOT_USER || !process.env.MINIO_ROOT_PASSWORD) {
    return t.skip('MinIO bilgileri .env içinde yok');
  }

  const bucket = process.env.MINIO_BUCKET || 'secureshare-files';
  const storage = createStorage(createMinioClientFromEnv(), bucket);
  try {
    await withTimeout(storage.ensureBucket(), 3000);
  } catch (e) {
    return t.skip(`MinIO'ya ulaşılamadı: ${e.message}`);
  }

  const db = memoryDb();
  const svc = createFileService({ storage, db, kek: crypto.randomBytes(16) });
  const ownerId = crypto.randomUUID();
  const original = crypto.randomBytes(200 * 1024); // 200 KB rastgele dosya
  let objectKey;

  try {
    const saved = await svc.uploadFile({ ownerId, originalName: 'entegrasyon.bin', buffer: original });
    objectKey = db.rows.get(saved.id).object_key;

    // MinIO'daki ham baytlar düz metin OLMAMALI ve boyut = orijinal + 16 bayt etiket
    const raw = await storage.get(objectKey);
    assert.strictEqual(raw.length, original.length + 16);
    assert.ok(!raw.includes(original.subarray(0, 64)));

    // Geri çekilince orijinaliyle birebir aynı olmalı
    const got = await svc.downloadFile({ fileId: saved.id, requesterId: ownerId });
    assert.ok(got.buffer.equals(original));
  } finally {
    if (objectKey) await storage.remove(objectKey).catch(() => {});
  }
});
