
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const app = express();
const port = Number(process.env.PORT) || 3000;

// JSON isteklerini oku
app.use(express.json({ limit: '1mb' }));

// PostgreSQL bağlantısı
const db = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

// Ortak veritabanı bağlantısı
app.locals.db = db;

// Backend kontrolü
app.get('/health', (req, res) => {
  res.json({
    status: 'Backend çalışıyor!',
  });
});

// Veritabanı bağlantı kontrolü
app.get('/health/db', async (req, res) => {
  try {
    const result = await db.query('SELECT 1 AS sonuc');

    res.json({
      status: 'Bağlantı başarılı!',
      database: result.rows[0].sonuc,
    });
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error.message);

    res.status(500).json({
      error: 'Veritabanına bağlanılamadı.',
    });
  }
});

// Kayıt ve giriş endpoint'leri
app.use('/api/auth', require('./routes/auth'));

// Dosya işlemleri endpoint'leri
app.use('/api/files', require('./routes/files'));


app.use((req, res) => {
  res.status(404).json({
    error: 'İstenen endpoint bulunamadı.',
  });
});

// Genel hata yakalayıcı
app.use((err, req, res, next) => {
  console.error('Sunucu hatası:', err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error: err.status && err.status < 500
      ? err.message
      : 'Sunucuda beklenmeyen bir hata oluştu.',
  });
});

// Sunucuyu başlat
const server = app.listen(port, () => {
  console.log(`Backend http://localhost:${port} adresinde çalışıyor.`);
});

// Beklenmeyen veritabanı hataları
db.on('error', (error) => {
  console.error('PostgreSQL hatası:', error.message);
});

// Sunucuyu kontrollü kapat
async function shutdown() {
  console.log('Backend kapatılıyor...');

  server.close(async () => {
    try {
      await db.end();
      console.log('Veritabanı bağlantısı kapatıldı.');
      process.exit(0);
    } catch (error) {
      console.error('Kapatma hatası:', error.message);
      process.exit(1);
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
