// Gerçek bir dosyayı ŞİFRELEYİP MinIO'ya yazar, geri çeker, çözer ve SHA-256 ile karşılaştırır.
//
// Kullanım:   cd backend && node scripts/demo-minio.js <dosya-yolu>
// Gereken .env değişkenleri: KEK_HEX, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD
// (isteğe bağlı: MINIO_ENDPOINT, MINIO_PORT, MINIO_BUCKET)
//
// Not: Bu demo veritabanı kullanmaz. Şifreli DEK / nonce / AAD bilgisi normalde
// files tablosuna yazılır; burada MinIO'da ".meta.json" yan dosyası olarak saklanır.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const fs = require('fs');
const crypto = require('crypto');
const { loadKek, encryptFile, decryptFile } = require('../crypto/encryption');
const { createMinioClientFromEnv, createStorage } = require('../storage/minioStorage');

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Kullanım: node scripts/demo-minio.js <dosya-yolu>');
    process.exit(1);
  }

  const kek = loadKek();
  const storage = createStorage(
    createMinioClientFromEnv(),
    process.env.MINIO_BUCKET || 'secureshare-files'
  );
  await storage.ensureBucket();
  console.log(`MinIO bağlantısı tamam, bucket: ${storage.bucket}`);

  // 1) Şifrele
  const original = fs.readFileSync(input);
  const fileId = crypto.randomUUID();
  const aad = Buffer.from(`${fileId}:demo-user`);
  const enc = encryptFile(original, kek, aad);

  // 2) MinIO'ya yaz (yalnızca şifreli veri + şifreli anahtar bilgisi)
  const dataKey = `demo/${fileId}`;
  const metaKey = `demo/${fileId}.meta.json`;
  await storage.put(dataKey, enc.encryptedData);
  await storage.put(metaKey, Buffer.from(JSON.stringify({
    algorithm: enc.algorithm,
    encryptedDek: enc.encryptedDek.toString('base64'),
    nonce: enc.nonce.toString('base64'),
    aad: aad.toString('base64'),
  })));
  console.log(`MinIO'ya yazıldı : ${dataKey} (${enc.encryptedData.length} bayt, şifreli)`);
  console.log(`Orijinal boyut   : ${original.length} bayt`);

  // 3) Geri çek
  const fetchedData = await storage.get(dataKey);
  const meta = JSON.parse((await storage.get(metaKey)).toString());

  // 4) Çöz
  const decrypted = decryptFile({
    encryptedData: fetchedData,
    encryptedDek: Buffer.from(meta.encryptedDek, 'base64'),
    nonce: Buffer.from(meta.nonce, 'base64'),
    aad: Buffer.from(meta.aad, 'base64'),
  }, kek);

  const outPath = `${input}.minio.dec`;
  fs.writeFileSync(outPath, decrypted);
  console.log(`Çözüldü          : ${outPath}`);

  const a = sha256(original), b = sha256(decrypted);
  console.log('Orijinal SHA-256 :', a);
  console.log('Çözülen  SHA-256 :', b);
  console.log(a === b ? 'SONUÇ: BAŞARILI ✔ (MinIO\'dan çekilen dosya orijinaliyle birebir aynı)' : 'SONUÇ: HATA ✘');
  console.log(`\nMinIO panelinde (http://localhost:9001) secureshare-files > demo/ klasörüne bakın:`);
  console.log(`  ${fileId} -> şifreli, okunamaz veri`);
  process.exit(a === b ? 0 : 1);
}

main().catch((e) => {
  console.error('HATA:', e.message);
  process.exit(1);
});
