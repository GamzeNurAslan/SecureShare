// Çalıştırma: cd backend && npm test
// Gerçek MinIO gerekmez; bellekte çalışan sahte bir istemci kullanılır.

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { Readable } = require('stream');
const { createStorage } = require('../storage/minioStorage');
const { encryptFile, decryptFile } = require('../crypto/encryption');

function fakeClient({ bucketExists = true } = {}) {
  const objects = new Map();
  const calls = [];
  return {
    objects, calls,
    async bucketExists() { calls.push('bucketExists'); return bucketExists; },
    async makeBucket(b) { calls.push('makeBucket:' + b); bucketExists = true; },
    async putObject(b, k, buf, size) {
      assert.strictEqual(size, buf.length);
      objects.set(`${b}/${k}`, Buffer.from(buf));
    },
    async getObject(b, k) {
      if (!objects.has(`${b}/${k}`)) throw new Error('NoSuchKey');
      // Gerçek istemci gibi parçalı akış döndür
      const data = objects.get(`${b}/${k}`);
      return Readable.from([data.subarray(0, 3), data.subarray(3)]);
    },
    async removeObject(b, k) { objects.delete(`${b}/${k}`); },
  };
}

test('ensureBucket: bucket yoksa oluşturur', async () => {
  const c = fakeClient({ bucketExists: false });
  await createStorage(c, 'b1').ensureBucket();
  assert.ok(c.calls.includes('makeBucket:b1'));
});

test('ensureBucket: bucket varsa dokunmaz', async () => {
  const c = fakeClient({ bucketExists: true });
  await createStorage(c, 'b1').ensureBucket();
  assert.ok(!c.calls.some((x) => x.startsWith('makeBucket')));
});

test('put -> get: aynı baytlar geri gelir (parçalı akış dahil)', async () => {
  const s = createStorage(fakeClient(), 'b1');
  const data = crypto.randomBytes(1000);
  await s.put('k1', data);
  assert.deepStrictEqual(await s.get('k1'), data);
});

test('remove: silinen nesne okunamaz', async () => {
  const s = createStorage(fakeClient(), 'b1');
  await s.put('k1', Buffer.from('x'));
  await s.remove('k1');
  await assert.rejects(() => s.get('k1'));
});

test('uçtan uca: şifrele -> depola -> geri çek -> çöz; depoda düz metin yok', async () => {
  const client = fakeClient();
  const s = createStorage(client, 'b1');
  const kek = crypto.randomBytes(16);
  const original = Buffer.from('cok gizli belge icerigi - cok gizli belge icerigi');
  const aad = Buffer.from('file-1:user-1');

  const enc = encryptFile(original, kek, aad);
  await s.put('obj/file-1', enc.encryptedData);

  // Depoda tutulan baytlar düz metni içermemeli
  for (const stored of client.objects.values()) assert.ok(!stored.includes(original));

  const fetched = await s.get('obj/file-1');
  const plain = decryptFile({ ...enc, encryptedData: fetched }, kek);
  assert.deepStrictEqual(plain, original);
});

test('depodaki veri bozulursa çözme reddedilir', async () => {
  const client = fakeClient();
  const s = createStorage(client, 'b1');
  const kek = crypto.randomBytes(16);
  const enc = encryptFile(Buffer.from('veri'), kek);
  await s.put('k', enc.encryptedData);
  client.objects.get('b1/k')[0] ^= 1; // depoda bir bit boz
  const fetched = await s.get('k');
  assert.throws(() => decryptFile({ ...enc, encryptedData: fetched }, kek));
});
