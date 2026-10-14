// AES-128-GCM ile DEK/KEK (zarf) şifreleme modülü.
//
// Akış:
//   Şifreleme: dosya --(DEK, AES-128-GCM)--> encryptedData
//              DEK   --(KEK, AES-128-GCM)--> encryptedDek
//   Açma:      encryptedDek --(KEK)--> DEK --> encryptedData --> dosya
//
// KEK .env dosyasından okunur (KEK_HEX), asla veritabanına/diske yazılmaz.

const crypto = require('crypto');

const ALGORITHM = 'aes-128-gcm';
const ALGORITHM_NAME = 'AES-128-GCM'; // files.encryption_algorithm sütunu için
const KEY_LENGTH = 16;   // 128 bit
const NONCE_LENGTH = 12; // GCM için önerilen boyut
const TAG_LENGTH = 16;   // 128 bit auth tag

// ---------- Anahtar işlemleri ----------

/** .env içindeki KEK_HEX değerini (32 hex karakter) Buffer olarak döner. */
function loadKek(hex = process.env.KEK_HEX) {
  if (typeof hex !== 'string' || !/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error('KEK_HEX geçersiz: 32 karakterlik (16 bayt) hex değer olmalı.');
  }
  return Buffer.from(hex, 'hex');
}

/** Her dosya için yeni rastgele 128 bit DEK üretir. */
function generateDek() {
  return crypto.randomBytes(KEY_LENGTH);
}

function assertKey(key, name) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
    throw new Error(`${name} 16 baytlık Buffer olmalı.`);
  }
}

// ---------- Düşük seviye AES-GCM ----------

function gcmEncrypt(plaintext, key, nonce, aad) {
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce, { authTagLength: TAG_LENGTH });
  if (aad && aad.length) cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { ciphertext, tag: cipher.getAuthTag() };
}

function gcmDecrypt(ciphertext, tag, key, nonce, aad) {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce, { authTagLength: TAG_LENGTH });
  if (aad && aad.length) decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  // Anahtar yanlış veya veri/AAD değiştirilmişse final() hata fırlatır.
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ---------- DEK sarma (wrap) / açma (unwrap) ----------

/** DEK'i KEK ile şifreler. Çıktı: nonce(12) || ciphertext(16) || tag(16) = 44 bayt */
function wrapDek(dek, kek, aad = Buffer.alloc(0)) {
  assertKey(dek, 'DEK');
  assertKey(kek, 'KEK');
  const nonce = crypto.randomBytes(NONCE_LENGTH);
  const { ciphertext, tag } = gcmEncrypt(dek, kek, nonce, aad);
  return Buffer.concat([nonce, ciphertext, tag]);
}

function unwrapDek(encryptedDek, kek, aad = Buffer.alloc(0)) {
  assertKey(kek, 'KEK');
  if (!Buffer.isBuffer(encryptedDek) || encryptedDek.length !== NONCE_LENGTH + KEY_LENGTH + TAG_LENGTH) {
    throw new Error('encryptedDek formatı geçersiz.');
  }
  const nonce = encryptedDek.subarray(0, NONCE_LENGTH);
  const ciphertext = encryptedDek.subarray(NONCE_LENGTH, NONCE_LENGTH + KEY_LENGTH);
  const tag = encryptedDek.subarray(NONCE_LENGTH + KEY_LENGTH);
  return gcmDecrypt(ciphertext, tag, kek, nonce, aad);
}

// ---------- Yüksek seviye: dosya şifrele / aç ----------

/**
 * Bir dosyayı (Buffer) şifreler.
 * @param {Buffer} plaintext  Dosya içeriği
 * @param {Buffer} kek        16 baytlık KEK (loadKek())
 * @param {Buffer} [aad]      Bağlam bilgisi, örn. Buffer.from(`${fileId}:${ownerId}`)
 * @returns {{encryptedData, encryptedDek, nonce, aad, algorithm}}
 *   encryptedData -> MinIO'ya yazılacak (ciphertext || tag)
 *   encryptedDek  -> files.encrypted_dek
 *   nonce         -> files.nonce
 *   aad           -> files.aad
 *   algorithm     -> files.encryption_algorithm
 */
function encryptFile(plaintext, kek, aad = Buffer.alloc(0)) {
  if (!Buffer.isBuffer(plaintext)) throw new Error('plaintext Buffer olmalı.');
  assertKey(kek, 'KEK');

  const dek = generateDek();
  const nonce = crypto.randomBytes(NONCE_LENGTH);
  const { ciphertext, tag } = gcmEncrypt(plaintext, dek, nonce, aad);
  const encryptedDek = wrapDek(dek, kek, aad);
  dek.fill(0); // DEK'i bellekten sil

  return {
    encryptedData: Buffer.concat([ciphertext, tag]),
    encryptedDek,
    nonce,
    aad,
    algorithm: ALGORITHM_NAME,
  };
}

/**
 * encryptFile çıktısını geri açar. Yanlış KEK, bozulmuş veri veya
 * yanlış AAD durumunda hata fırlatır.
 */
function decryptFile({ encryptedData, encryptedDek, nonce, aad = Buffer.alloc(0) }, kek) {
  assertKey(kek, 'KEK');
  if (!Buffer.isBuffer(encryptedData) || encryptedData.length < TAG_LENGTH) {
    throw new Error('encryptedData geçersiz.');
  }
  const dek = unwrapDek(encryptedDek, kek, aad);
  try {
    const ciphertext = encryptedData.subarray(0, encryptedData.length - TAG_LENGTH);
    const tag = encryptedData.subarray(encryptedData.length - TAG_LENGTH);
    return gcmDecrypt(ciphertext, tag, dek, nonce, aad);
  } finally {
    dek.fill(0);
  }
}

module.exports = {
  ALGORITHM_NAME,
  loadKek,
  generateDek,
  wrapDek,
  unwrapDek,
  encryptFile,
  decryptFile,
};
