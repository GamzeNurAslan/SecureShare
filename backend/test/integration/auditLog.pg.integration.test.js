// GERÇEK PostgreSQL'e karşı audit log testi (docs/database/schema.sql tablolarıyla).
//
// PostgreSQL çalışmıyorsa ya da .env içinde POSTGRES_* bilgileri yoksa test KENDİLİĞİNDEN ATLANIR.
// Çalıştırma: Docker'da postgres açıkken (`docker compose up -d postgres`) `cd backend && npm test`.
//
// Test, kendi geçici şemasını (audit_it_xxxx) oluşturup işi bitince siler; gerçek tablolarınıza dokunmaz.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

const fs = require('fs');
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { createAuditLogger, computeEntryHash, GENESIS_HASH } = require('../../audit/auditLog');

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('zaman aşımı')), ms))]);

test('Audit log: gerçek PostgreSQL ile hash zinciri', async (t) => {
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) return t.skip('POSTGRES_* bilgileri .env içinde yok');

  let Pool;
  try { ({ Pool } = require('pg')); } catch { return t.skip('pg paketi yüklü değil'); }

  const base = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: POSTGRES_USER, password: POSTGRES_PASSWORD, database: POSTGRES_DB,
  };

  const schema = 'audit_it_' + crypto.randomBytes(4).toString('hex');
  const admin = new Pool({ ...base, max: 1 });
  try {
    await withTimeout(admin.query('SELECT 1'), 3000);
  } catch (e) {
    await admin.end().catch(() => {});
    return t.skip(`PostgreSQL'e ulaşılamadı: ${e.message}`);
  }

  // Geçici şema + gerçek şema dosyası (CREATE EXTENSION satırı çıkarılır; gen_random_uuid PG13+ çekirdekte)
  const schemaSql = fs
    .readFileSync(path.resolve(__dirname, '..', '..', '..', 'docs', 'database', 'schema.sql'), 'utf8')
    .replace(/CREATE EXTENSION[^;]*;/i, '');
  await admin.query(`CREATE SCHEMA ${schema}`);
  const setup = await admin.connect();
  await setup.query(`SET search_path TO ${schema}, public`);
  await setup.query(schemaSql);
  setup.release();

  const pool = new Pool({ ...base, max: 10, options: `-c search_path=${schema},public` });
  const audit = createAuditLogger({ db: pool });

  // Kullanıcılar ve dosyalar
  const mkUser = async (email) =>
    (await pool.query(`INSERT INTO users (email, password_hash) VALUES ($1,'x') RETURNING id`, [email])).rows[0].id;
  const mkFile = async (owner, key) =>
    (await pool.query(
      `INSERT INTO files (owner_id, original_name, object_key, size_bytes, encrypted_dek, nonce)
       VALUES ($1,'a.txt',$2,1,'\\x00','\\x00') RETURNING id`, [owner, key])).rows[0].id;
  const u1 = await mkUser('a@example.com');
  const u2 = await mkUser('b@example.com');
  const f1 = await mkFile(u1, 'k1');
  const f2 = await mkFile(u1, 'k2');

  try {
    await t.test('dört olay türü yazılır ve zincir doğrulanır (JSONB ve zaman damgası gidiş-dönüş)', async () => {
      await audit.logFileShared({ actorUserId: u1, fileId: f1, targetUserId: u2, permissions: { read: true, download: true }, expiresAt: new Date('2026-12-01T00:00:00.123Z'), ip: '10.0.0.5' });
      await audit.logFileDownloaded({ actorUserId: u2, fileId: f1, sizeBytes: 4096 });
      await audit.logAccessDenied({ actorUserId: u2, fileId: f2, attemptedAction: 'DOWNLOAD', reason: 'NO_PERMISSION' });
      await audit.logPermissionRevoked({ actorUserId: u1, fileId: f1, targetUserId: u2 });

      const rows = (await pool.query('SELECT action, result, previous_hash FROM audit_logs ORDER BY id')).rows;
      assert.deepStrictEqual(rows.map((r) => [r.action, r.result]), [
        ['FILE_SHARED', 'SUCCESS'], ['FILE_DOWNLOADED', 'SUCCESS'],
        ['FILE_ACCESS_DENIED', 'DENIED'], ['FILE_PERMISSION_REVOKED', 'SUCCESS'],
      ]);
      assert.strictEqual(rows[0].previous_hash, GENESIS_HASH);
      const res = await audit.verifyChain({ batchSize: 2 });
      assert.deepStrictEqual({ valid: res.valid, checked: res.checked }, { valid: true, checked: 4 });
    });

    await t.test('20 eşzamanlı ekleme (gerçek advisory lock) zinciri çatallamaz', async () => {
      await Promise.all(Array.from({ length: 20 }, (_, i) =>
        audit.logFileDownloaded({ actorUserId: u2, fileId: f1, sizeBytes: i })));
      const { rows } = await pool.query('SELECT previous_hash FROM audit_logs');
      assert.strictEqual(rows.length, 24);
      assert.strictEqual(new Set(rows.map((r) => r.previous_hash)).size, 24);
      assert.strictEqual((await audit.verifyChain()).valid, true);
    });

    await t.test('SQL ile kayıt değiştirilirse tespit edilir', async () => {
      await pool.query(`UPDATE audit_logs SET result = 'FAILURE' WHERE id = (SELECT min(id) FROM audit_logs)`);
      const res = await audit.verifyChain();
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.reason, 'ENTRY_HASH_MISMATCH');
      await pool.query(`UPDATE audit_logs SET result = 'SUCCESS' WHERE id = (SELECT min(id) FROM audit_logs)`);
      assert.strictEqual((await audit.verifyChain()).valid, true); // geri alınca yeniden geçerli
    });

    await t.test('ortadan kayıt silinirse tespit edilir', async () => {
      const victim = (await pool.query(`SELECT id FROM audit_logs ORDER BY id OFFSET 5 LIMIT 1`)).rows[0].id;
      const saved = (await pool.query('SELECT * FROM audit_logs WHERE id = $1', [victim])).rows[0];
      await pool.query('DELETE FROM audit_logs WHERE id = $1', [victim]);
      const res = await audit.verifyChain();
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.reason, 'PREVIOUS_HASH_MISMATCH');
      await pool.query(
        `INSERT INTO audit_logs (id, actor_user_id, file_id, action, result, details, previous_hash, entry_hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [saved.id, saved.actor_user_id, saved.file_id, saved.action, saved.result, saved.details, saved.previous_hash, saved.entry_hash, saved.created_at]);
      assert.strictEqual((await audit.verifyChain()).valid, true);
    });

    await t.test('dosya ve kullanıcı silinince (ON DELETE SET NULL) zincir bozulmaz', async () => {
      await pool.query('DELETE FROM files WHERE id = $1', [f1]);
      const nulls = (await pool.query('SELECT count(*)::int AS n FROM audit_logs WHERE file_id IS NULL')).rows[0].n;
      assert.ok(nulls > 0, 'FK sütunları NULL olmalıydı');
      await pool.query('DELETE FROM users WHERE id = $1', [u2]);
      const res = await audit.verifyChain();
      assert.strictEqual(res.valid, true, `zincir bozuldu: ${res.reason} (id ${res.firstInvalidId})`);
    });

    await t.test('HMAC anahtarlı zincir gerçek veritabanında doğrulanır', async () => {
      await pool.query('DELETE FROM audit_logs');
      const key = crypto.randomBytes(32);
      const hmacAudit = createAuditLogger({ db: pool, hmacKey: key });
      await hmacAudit.logFileDownloaded({ actorUserId: u1, fileId: f2, sizeBytes: 1 });
      await hmacAudit.logFileDownloaded({ actorUserId: u1, fileId: f2, sizeBytes: 2 });
      assert.strictEqual((await hmacAudit.verifyChain()).valid, true);
      assert.strictEqual((await audit.verifyChain()).valid, false); // anahtarsız doğrulama başarısız
      void computeEntryHash;
    });
  } finally {
    await pool.end().catch(() => {});
    await admin.query(`DROP SCHEMA ${schema} CASCADE`).catch(() => {});
    await admin.end().catch(() => {});
  }
});
