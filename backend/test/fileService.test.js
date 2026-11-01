// Çalıştırma: cd backend && npm test
// Gerçek MinIO ve PostgreSQL gerekmez; sahte depolama ve sahte veritabanı kullanılır.

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { createFileService, FileServiceError } = require('../services/fileService');

function fakeStorage() {
  const objects = new Map();
  return {
    objects,
    async put(k, b) { objects.set(k, Buffer.from(b)); },
    async get(k) { if (!objects.has(k)) throw new Error('NoSuchKey'); return Buffer.from(objects.get(k)); },
    async remove(k) { objects.delete(k); },
  };
}

// pg Pool'un query(text, params) arayüzünü taklit eder (yalnızca files için)
function fakeDb({ failInsert = false } = {}) {
  const rows = new Map();
  return {
    rows,
    async query(text, p) {
      if (text.includes('INSERT INTO files')) {
        if (failInsert) throw new Error('db hatası');
        const row = {
          id: p[0], owner_id: p[1], original_name: p[2], object_key: p[3], mime_type: p[4],
          size_bytes: p[5], encrypted_dek: p[6], nonce: p[7], aad: p[8],
          encryption_algorithm: p[9], created_at: new Date(),
        };
        rows.set(row.id, row);
        return { rows: [row] };
      }
      if (text.includes('FROM files WHERE id')) {
        return { rows: rows.has(p[0]) ? [rows.get(p[0])] : [] };
      }
      throw new Error('beklenmeyen sorgu');
    },
  };
}

const owner = crypto.randomUUID();
const other = crypto.randomUUID();

function setup(opts) {
  const storage = fakeStorage();
  const db = fakeDb(opts && opts.db);
  const kek = crypto.randomBytes(16);
  const svc = createFileService({ storage, db, kek, maxBytes: opts && opts.maxBytes });
  return { storage, db, kek, svc };
}

test('yükle -> indir: sahibi aynı dosyayı geri alır', async () => {
  const { svc } = setup();
  const content = Buffer.from('gizli belge içeriği ğüşiöç');
  const saved = await svc.uploadFile({ ownerId: owner, originalName: 'rapor.txt', mimeType: 'text/plain', buffer: content });
  assert.strictEqual(saved.sizeBytes, content.length);
  const got = await svc.downloadFile({ fileId: saved.id, requesterId: owner });
  assert.deepStrictEqual(got.buffer, content);
  assert.strictEqual(got.originalName, 'rapor.txt');
  assert.strictEqual(got.mimeType, 'text/plain');
});

test('depoda düz metin yok, yalnızca şifreli veri var', async () => {
  const { svc, storage } = setup();
  const content = Buffer.from('cok-gizli-metin-cok-gizli-metin');
  await svc.uploadFile({ ownerId: owner, originalName: 'a.txt', buffer: content });
  assert.strictEqual(storage.objects.size, 1);
  for (const stored of storage.objects.values()) {
    assert.ok(!stored.includes(content));
    assert.strictEqual(stored.length, content.length + 16); // + GCM etiketi
  }
});

test('files kaydı şemaya uygun alanlarla yazılır', async () => {
  const { svc, db } = setup();
  const saved = await svc.uploadFile({ ownerId: owner, originalName: 'a.txt', buffer: Buffer.from('x') });
  const row = db.rows.get(saved.id);
  assert.strictEqual(row.encryption_algorithm, 'AES-128-GCM');
  assert.strictEqual(row.nonce.length, 12);
  assert.strictEqual(row.encrypted_dek.length, 44);
  assert.strictEqual(row.object_key, `${owner}/${saved.id}`);
  assert.strictEqual(row.aad.toString(), `${saved.id}:${owner}`);
  assert.strictEqual(row.size_bytes, 1);
});

test('başka kullanıcı indiremez (403)', async () => {
  const { svc } = setup();
  const saved = await svc.uploadFile({ ownerId: owner, originalName: 'a.txt', buffer: Buffer.from('x') });
  await assert.rejects(
    () => svc.downloadFile({ fileId: saved.id, requesterId: other }),
    (e) => e instanceof FileServiceError && e.status === 403
  );
});

test('olmayan ya da geçersiz kimlikli dosya 404 verir', async () => {
  const { svc } = setup();
  for (const id of [crypto.randomUUID(), 'abc', "1' OR '1'='1"]) {
    await assert.rejects(
      () => svc.downloadFile({ fileId: id, requesterId: owner }),
      (e) => e instanceof FileServiceError && e.status === 404
    );
  }
});

test('depodaki veri bozulursa indirme reddedilir', async () => {
  const { svc, storage } = setup();
  const saved = await svc.uploadFile({ ownerId: owner, originalName: 'a.txt', buffer: Buffer.from('veri') });
  storage.objects.get(`${owner}/${saved.id}`)[0] ^= 1;
  await assert.rejects(
    () => svc.downloadFile({ fileId: saved.id, requesterId: owner }),
    (e) => e.code === 'DECRYPT_FAILED'
  );
});

test('veritabanındaki AAD oynanırsa indirme reddedilir', async () => {
  const { svc, db } = setup();
  const saved = await svc.uploadFile({ ownerId: owner, originalName: 'a.txt', buffer: Buffer.from('veri') });
  db.rows.get(saved.id).aad = Buffer.from(`${crypto.randomUUID()}:${owner}`);
  await assert.rejects(
    () => svc.downloadFile({ fileId: saved.id, requesterId: owner }),
    (e) => e.code === 'INTEGRITY_ERROR'
  );
});

test('veritabanı kaydı başarısız olursa depodaki nesne silinir', async () => {
  const { svc, storage } = setup({ db: { failInsert: true } });
  await assert.rejects(() => svc.uploadFile({ ownerId: owner, originalName: 'a.txt', buffer: Buffer.from('x') }));
  assert.strictEqual(storage.objects.size, 0);
});

test('boyut sınırını aşan dosya reddedilir (413)', async () => {
  const { svc, storage } = setup({ maxBytes: 10 });
  await assert.rejects(
    () => svc.uploadFile({ ownerId: owner, originalName: 'a.txt', buffer: Buffer.alloc(11) }),
    (e) => e.status === 413
  );
  assert.strictEqual(storage.objects.size, 0);
});

test('eksik alanlar 400 verir', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.uploadFile({ originalName: 'a', buffer: Buffer.alloc(1) }), (e) => e.status === 400);
  await assert.rejects(() => svc.uploadFile({ ownerId: owner, buffer: Buffer.alloc(1) }), (e) => e.status === 400);
  await assert.rejects(() => svc.uploadFile({ ownerId: owner, originalName: 'a', buffer: 'metin' }), (e) => e.status === 400);
});
