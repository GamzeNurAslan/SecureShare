
const express = require('express');
const { Pool } = require('pg'); //PostgreSQL'e bağlantı kurmak ve sorgular çalıştırmak için
require('dotenv').config({ path: '../.env' }); //Ortam değişkenlerini okumayı sağlıyor

const app = express();
const port = 3000;

// PostgreSQL bağlantı ayarları
const db = new Pool({
  host: 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});
///health: Backend'in çalıştığını kontrol ediyor.

// Backendi çalıştığını kontrol eden endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Backend çalışıyor!' });
});


///health/db: Veritabanına gerçekten sorgu göndererek bağlantıyı kontrol ediyor.

// PostgreSQL bağlantısını test eden endpoint
app.get('/health/db', async (req, res) => {
  try {
    const result = await db.query('SELECT 1 AS sonuc');
    res.json({
      status: 'Bağlantı başarılı!',
      database: result.rows[0].sonuc,
    });
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error.message);
    res.status(500).json({ error: 'Veritabanına bağlanılamadı.' });
  }
});

app.listen(port, () => {
  console.log(`Backend http://localhost:${port} adresinde çalışıyor.`);
});
