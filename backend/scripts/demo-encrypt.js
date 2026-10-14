// Gerçek bir dosyayı şifreleyip geri açar ve SHA-256 ile karşılaştırır.
// Kullanım:  cd backend && node scripts/demo-encrypt.js <dosya-yolu>
// (.env içinde KEK_HEX tanımlı olmalı)

require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const crypto = require('crypto');
const { loadKek, encryptFile, decryptFile } = require('../crypto/encryption');

const input = process.argv[2];
if (!input) {
  console.error('Kullanım: node scripts/demo-encrypt.js <dosya-yolu>');
  process.exit(1);
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const kek = loadKek();
const original = fs.readFileSync(input);
const aad = Buffer.from('demo-file-id:demo-owner-id');

const enc = encryptFile(original, kek, aad);
fs.writeFileSync(`${input}.enc`, enc.encryptedData);
console.log('Şifrelendi  ->', `${input}.enc`, `(${enc.encryptedData.length} bayt)`);
console.log('encryptedDek (hex):', enc.encryptedDek.toString('hex'));
console.log('nonce (hex)       :', enc.nonce.toString('hex'));

const decrypted = decryptFile({ ...enc, encryptedData: fs.readFileSync(`${input}.enc`) }, kek);
fs.writeFileSync(`${input}.dec`, decrypted);
console.log('Çözüldü     ->', `${input}.dec`);

console.log('Orijinal SHA-256:', sha256(original));
console.log('Çözülen  SHA-256:', sha256(decrypted));
console.log(sha256(original) === sha256(decrypted) ? 'SONUÇ: BAŞARILI ✔ (dosyalar birebir aynı)' : 'SONUÇ: HATA ✘');
