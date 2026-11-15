// MinIO'da bucket'ı oluşturur (varsa dokunmaz). Yeni ortam kurarken bir kez çalıştırılır.
// Kullanım:  cd backend && node scripts/init-storage.js
// Gereken .env değişkenleri: MINIO_ROOT_USER, MINIO_ROOT_PASSWORD
// (isteğe bağlı: MINIO_ENDPOINT, MINIO_PORT, MINIO_BUCKET)

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const { createMinioClientFromEnv, createStorage } = require('../storage/minioStorage');

async function main() {
  const bucket = process.env.MINIO_BUCKET || 'secureshare-files';
  const storage = createStorage(createMinioClientFromEnv(), bucket);
  await storage.ensureBucket();
  console.log(`Bucket hazır: ${bucket}`);
}

main().catch((e) => {
  console.error('HATA:', e.message);
  console.error("MinIO çalışıyor mu? (proje kökünde: docker compose up -d minio)");
  process.exit(1);
});
