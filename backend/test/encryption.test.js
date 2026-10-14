// Çalıştırma: cd backend && npm test   (Node 18+ yerleşik test runner)

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const {
  loadKek, generateDek, wrapDek, unwrapDek, encryptFile, decryptFile,
} = require('../crypto/encryption');

const kek = crypto.randomBytes(16);
const aad = Buffer.from('file-123:user-456');

test('şifrele -> aç: orijinal veri geri gelir', () => {
  const msg = Buffer.from('gizli dosya içeriği ğüşiöç');
  const enc = encryptFile(msg, kek, aad);
  assert.deepStrictEqual(decryptFile(enc, kek), msg);
});

test('şifreli veri düz metni içermez', () => {
  const msg = Buffer.from('cok-gizli-metin-cok-gizli-metin');
  const enc = encryptFile(msg, kek, aad);
  assert.ok(!enc.encryptedData.includes(msg));
});

test('boş dosya ve 5 MB dosya doğru çalışır', () => {
  for (const size of [0, 5 * 1024 * 1024]) {
    const data = crypto.randomBytes(size);
    assert.deepStrictEqual(decryptFile(encryptFile(data, kek, aad), kek), data);
  }
});

test('DEK sarma/açma: KEK ile DEK geri gelir', () => {
  const dek = generateDek();
  const wrapped = wrapDek(dek, kek);
  assert.strictEqual(wrapped.length, 44); // 12 nonce + 16 ct + 16 tag
  assert.deepStrictEqual(unwrapDek(wrapped, kek), dek);
});

test('yanlış KEK ile açılamaz', () => {
  const enc = encryptFile(Buffer.from('veri'), kek, aad);
  assert.throws(() => decryptFile(enc, crypto.randomBytes(16)));
});

test('şifreli veri değiştirilirse açılamaz (bütünlük)', () => {
  const enc = encryptFile(Buffer.from('veri bütünlüğü'), kek, aad);
  enc.encryptedData[0] ^= 1;
  assert.throws(() => decryptFile(enc, kek));
});

test('auth tag değiştirilirse açılamaz', () => {
  const enc = encryptFile(Buffer.from('veri'), kek, aad);
  enc.encryptedData[enc.encryptedData.length - 1] ^= 1;
  assert.throws(() => decryptFile(enc, kek));
});

test('şifrelenmiş DEK değiştirilirse açılamaz', () => {
  const enc = encryptFile(Buffer.from('veri'), kek, aad);
  enc.encryptedDek[20] ^= 1;
  assert.throws(() => decryptFile(enc, kek));
});

test('yanlış AAD ile açılamaz (başka dosyaya bağlanamaz)', () => {
  const enc = encryptFile(Buffer.from('veri'), kek, aad);
  assert.throws(() => decryptFile({ ...enc, aad: Buffer.from('file-999:user-456') }, kek));
});

test('yanlış nonce ile açılamaz', () => {
  const enc = encryptFile(Buffer.from('veri'), kek, aad);
  assert.throws(() => decryptFile({ ...enc, nonce: crypto.randomBytes(12) }, kek));
});

test('aynı dosya iki kez şifrelenince farklı çıktı, farklı DEK/nonce üretir', () => {
  const msg = Buffer.from('ayni veri');
  const a = encryptFile(msg, kek, aad);
  const b = encryptFile(msg, kek, aad);
  assert.notDeepStrictEqual(a.encryptedData, b.encryptedData);
  assert.notDeepStrictEqual(a.encryptedDek, b.encryptedDek);
  assert.notDeepStrictEqual(a.nonce, b.nonce);
});

test('çıktı veritabanı şemasıyla uyumlu', () => {
  const enc = encryptFile(Buffer.from('x'), kek, aad);
  assert.strictEqual(enc.algorithm, 'AES-128-GCM'); // files.encryption_algorithm
  assert.strictEqual(enc.nonce.length, 12);         // files.nonce
  assert.strictEqual(enc.encryptedDek.length, 44);  // files.encrypted_dek
});

test('loadKek: geçerli ve geçersiz değerler', () => {
  assert.strictEqual(loadKek('00112233445566778899aabbccddeeff').length, 16);
  assert.throws(() => loadKek(undefined));
  assert.throws(() => loadKek('kısa'));
  assert.throws(() => loadKek('zz112233445566778899aabbccddeeff')); // hex değil
});
