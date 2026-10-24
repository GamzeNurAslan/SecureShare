// MinIO (S3 uyumlu) nesne depolama sarmalayıcısı.
// Buraya yalnızca ŞİFRELİ veri yazılır; düz metin dosya asla MinIO'ya gitmez.
//
// Test edilebilirlik için istemci dışarıdan verilir (createStorage).
// Gerçek istemci için createMinioClientFromEnv() kullanılır.

/** .env değişkenlerinden gerçek MinIO istemcisini oluşturur. */
function createMinioClientFromEnv(env = process.env) {
  const Minio = require('minio'); // yalnızca burada yüklenir, testler paketsiz de çalışır
  if (!env.MINIO_ROOT_USER || !env.MINIO_ROOT_PASSWORD) {
    throw new Error('MINIO_ROOT_USER / MINIO_ROOT_PASSWORD .env içinde tanımlı olmalı.');
  }
  return new Minio.Client({
    endPoint: env.MINIO_ENDPOINT || 'localhost',
    port: Number(env.MINIO_PORT || 9000),
    useSSL: false, // yerel geliştirme; canlıda TLS kullanılmalı
    accessKey: env.MINIO_ROOT_USER,
    secretKey: env.MINIO_ROOT_PASSWORD,
  });
}

/** Bir akışı (stream) tek bir Buffer'a toplar. */
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function createStorage(client, bucket) {
  if (!client) throw new Error('MinIO istemcisi gerekli.');
  if (!bucket) throw new Error('Bucket adı gerekli.');

  return {
    bucket,

    /** Bucket yoksa oluşturur (varsa dokunmaz). */
    async ensureBucket() {
      const exists = await client.bucketExists(bucket);
      if (!exists) await client.makeBucket(bucket);
    },

    /** Nesneyi yazar. */
    async put(key, buffer) {
      if (!Buffer.isBuffer(buffer)) throw new Error('put: buffer bekleniyor.');
      await client.putObject(bucket, key, buffer, buffer.length);
    },

    /** Nesneyi okuyup Buffer olarak döner. */
    async get(key) {
      const stream = await client.getObject(bucket, key);
      return streamToBuffer(stream);
    },

    /** Nesneyi siler. */
    async remove(key) {
      await client.removeObject(bucket, key);
    },
  };
}

module.exports = { createMinioClientFromEnv, createStorage, streamToBuffer };
