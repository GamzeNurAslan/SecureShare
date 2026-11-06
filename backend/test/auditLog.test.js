// Çalıştırma: cd backend && npm test
// Gerçek PostgreSQL gerekmez; kilit ve işlem mantığını taklit eden sahte bir pg kullanılır.

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const {
  ACTIONS, RESULTS, GENESIS_HASH, AuditError,
  canonicalize, computeEntryHash, loadAuditHmacKey, createAuditLogger,
} = require('../audit/auditLog');

const tick = () => new Promise((r) => setImmediate(r));

// pg Pool taklidi: BEGIN/COMMIT/ROLLBACK, pg_advisory_xact_lock (FIFO kilit), audit_logs INSERT/SELECT
function fakePg({ failNextInsert = false } = {}) {
  const rows = [];
  let seq = 0;
  let lockQueue = Promise.resolve();
  const state = { failNextInsert, rollbacks: 0 };

  function makeClient() {
    let release = null;
    const free = () => { if (release) { release(); release = null; } };
    return {
      async query(text, p) {
        const t = text.trim();
        if (t === 'BEGIN') return { rows: [] };
        if (t === 'COMMIT') { free(); return { rows: [] }; }
        if (t === 'ROLLBACK') { state.rollbacks += 1; free(); return { rows: [] }; }
        if (t.startsWith('SELECT pg_advisory_xact_lock')) {
          const prev = lockQueue;
          lockQueue = new Promise((r) => { release = r; });
          await prev;
          return { rows: [] };
        }
        if (t.startsWith('SELECT entry_hash FROM audit_logs')) {
          await tick(); // araya girebilsinler; kilit yoksa zincir çatallanır
          const last = rows[rows.length - 1];
          return { rows: last ? [{ entry_hash: last.entry_hash }] : [] };
        }
        if (t.startsWith('INSERT INTO audit_logs')) {
          await tick();
          if (state.failNextInsert) { state.failNextInsert = false; throw new Error('insert hatası'); }
          const row = {
            id: String(++seq), actor_user_id: p[0], file_id: p[1], action: p[2], result: p[3],
            details: JSON.parse(p[4]), previous_hash: p[5], entry_hash: p[6], created_at: p[7],
          };
          rows.push(row);
          return { rows: [{ id: row.id }] };
        }
        throw new Error('beklenmeyen sorgu: ' + t.slice(0, 40));
      },
      release: free,
    };
  }

  return {
    rows, state,
    connect: async () => makeClient(),
    async query(text, p) { // verifyChain okuması
      const after = Number(p[0]);
      const found = rows.filter((r) => Number(r.id) > after).slice(0, p[1]);
      return { rows: found.map((r) => ({ ...r, details: JSON.parse(JSON.stringify(r.details)) })) };
    },
  };
}

const u1 = crypto.randomUUID();
const u2 = crypto.randomUUID();
const f1 = crypto.randomUUID();
const f2 = crypto.randomUUID();

function fixedClock() {
  let n = 0;
  return () => new Date(Date.UTC(2026, 10, 2, 10, 0, 0, 0) + (n++) * 1000);
}

function setup(opts = {}) {
  const db = fakePg(opts.pg);
  const audit = createAuditLogger({ db, now: fixedClock(), hmacKey: opts.hmacKey });
  return { db, audit };
}

// ---------- Hash yöntemi ----------

test('canonicalize: anahtar sırasından bağımsız ve deterministik', () => {
  assert.strictEqual(canonicalize({ b: 1, a: [2, { d: 1, c: 2 }] }), canonicalize({ a: [2, { c: 2, d: 1 }], b: 1 }));
  assert.strictEqual(canonicalize({ a: undefined, b: 1 }), '{"b":1}');
});

test('entry_hash: aynı girdi aynı hash, herhangi bir alan değişince farklı hash', () => {
  const base = {
    previousHash: GENESIS_HASH, action: 'FILE_DOWNLOADED', result: 'SUCCESS',
    details: { actor_user_id: u1, file_id: f1, size_bytes: 10 }, createdAt: new Date('2026-11-02T10:00:00.000Z'),
  };
  const h = computeEntryHash(base);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.strictEqual(computeEntryHash({ ...base }), h);
  const variants = [
    { previousHash: '1'.repeat(64) },
    { action: 'FILE_SHARED' },
    { result: 'FAILURE' },
    { details: { ...base.details, size_bytes: 11 } },
    { details: { ...base.details, actor_user_id: u2 } },
    { createdAt: new Date('2026-11-02T10:00:00.001Z') },
  ];
  for (const v of variants) assert.notStrictEqual(computeEntryHash({ ...base, ...v }), h);
});

test('HMAC modu: farklı hash üretir, anahtara bağlıdır', () => {
  const base = {
    previousHash: GENESIS_HASH, action: 'FILE_DOWNLOADED', result: 'SUCCESS',
    details: { actor_user_id: u1, file_id: f1 }, createdAt: new Date('2026-11-02T10:00:00.000Z'),
  };
  const plain = computeEntryHash(base);
  const k1 = computeEntryHash(base, Buffer.alloc(32, 1));
  const k2 = computeEntryHash(base, Buffer.alloc(32, 2));
  assert.notStrictEqual(k1, plain);
  assert.notStrictEqual(k1, k2);
});

test('loadAuditHmacKey: tanımsızsa null, geçersizse hata', () => {
  assert.strictEqual(loadAuditHmacKey({}), null);
  assert.strictEqual(loadAuditHmacKey({ AUDIT_HMAC_KEY: 'ab'.repeat(16) }).length, 16);
  assert.throws(() => loadAuditHmacKey({ AUDIT_HMAC_KEY: 'kısa' }), AuditError);
});

// ---------- Zincir ----------

test('ilk kayıt GENESIS_HASH ile, sonrakiler önceki entry_hash ile bağlanır', async () => {
  const { db, audit } = setup();
  const a = await audit.logFileDownloaded({ actorUserId: u1, fileId: f1, sizeBytes: 5 });
  const b = await audit.logFileDownloaded({ actorUserId: u1, fileId: f1, sizeBytes: 6 });
  assert.strictEqual(a.previousHash, GENESIS_HASH);
  assert.strictEqual(b.previousHash, a.entryHash);
  assert.strictEqual(db.rows[1].previous_hash, db.rows[0].entry_hash);
  assert.match(a.entryHash, /^[0-9a-f]{64}$/);
});

test('sağlam zincir doğrulanır', async () => {
  const { audit } = setup();
  for (let i = 0; i < 7; i++) await audit.logFileDownloaded({ actorUserId: u1, fileId: f1, sizeBytes: i });
  const res = await audit.verifyChain({ batchSize: 3 }); // birden çok sayfa
  assert.deepStrictEqual({ valid: res.valid, checked: res.checked }, { valid: true, checked: 7 });
});

test('boş tablo geçerli sayılır', async () => {
  const { audit } = setup();
  const res = await audit.verifyChain();
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.lastHash, GENESIS_HASH);
});

// ---------- Olay türleri ----------

test('FILE_SHARED doğru action, sonuç ve sınırlı detaylarla yazılır', async () => {
  const { db, audit } = setup();
  await audit.logFileShared({
    actorUserId: u1, fileId: f1, targetUserId: u2,
    permissions: { read: true, download: true }, expiresAt: new Date('2026-12-01T00:00:00Z'), ip: '10.0.0.5',
  });
  const r = db.rows[0];
  assert.strictEqual(r.action, 'FILE_SHARED');
  assert.strictEqual(r.result, 'SUCCESS');
  assert.strictEqual(r.actor_user_id, u1);
  assert.strictEqual(r.file_id, f1);
  assert.deepStrictEqual(r.details, {
    target_user_id: u2, can_read: true, can_download: true, can_share: false, can_delete: false,
    expires_at: '2026-12-01T00:00:00.000Z', ip: '10.0.0.5', actor_user_id: u1, file_id: f1,
  });
});

test('FILE_PERMISSION_REVOKED yazılır', async () => {
  const { db, audit } = setup();
  await audit.logPermissionRevoked({ actorUserId: u1, fileId: f1, targetUserId: u2 });
  assert.strictEqual(db.rows[0].action, 'FILE_PERMISSION_REVOKED');
  assert.strictEqual(db.rows[0].result, 'SUCCESS');
  assert.strictEqual(db.rows[0].details.target_user_id, u2);
});

test('FILE_DOWNLOADED yazılır', async () => {
  const { db, audit } = setup();
  await audit.logFileDownloaded({ actorUserId: u2, fileId: f1, sizeBytes: 1234 });
  assert.strictEqual(db.rows[0].action, 'FILE_DOWNLOADED');
  assert.strictEqual(db.rows[0].result, 'SUCCESS');
  assert.strictEqual(db.rows[0].details.size_bytes, 1234);
});

test('FILE_ACCESS_DENIED yazılır (yetkisiz ve süresi dolmuş izin)', async () => {
  const { db, audit } = setup();
  await audit.logAccessDenied({ actorUserId: u2, fileId: f1, attemptedAction: 'DOWNLOAD', reason: 'NO_PERMISSION' });
  await audit.logAccessDenied({ actorUserId: u2, fileId: f1, attemptedAction: 'READ', reason: 'PERMISSION_EXPIRED' });
  assert.deepStrictEqual(db.rows.map((r) => [r.action, r.result, r.details.reason]), [
    ['FILE_ACCESS_DENIED', 'DENIED', 'NO_PERMISSION'],
    ['FILE_ACCESS_DENIED', 'DENIED', 'PERMISSION_EXPIRED'],
  ]);
});

test('kimliği bilinmeyen kullanıcının reddedilen erişimi (actor null) yazılabilir', async () => {
  const { db, audit } = setup();
  await audit.logAccessDenied({ fileId: f1, attemptedAction: 'READ', reason: 'NO_PERMISSION' });
  assert.strictEqual(db.rows[0].actor_user_id, null);
  assert.strictEqual((await audit.verifyChain()).valid, true);
});

// ---------- Girdi doğrulama (sınırlı detay) ----------

test('izin verilmeyen ya da hassas anahtarlar reddedilir', async () => {
  const { db, audit } = setup();
  const bad = [
    { password: 'x' }, { file_content: 'abc' }, { kek: 'abc' },
    { actor_user_id: u2 },           // kimlik kopyası yalnızca logger tarafından eklenir
    { size_bytes: -1 }, { ip: 'x'.repeat(100) },
  ];
  for (const details of bad) {
    await assert.rejects(
      () => audit.append({ action: ACTIONS.FILE_DOWNLOADED, result: RESULTS.SUCCESS, actorUserId: u1, fileId: f1, details }),
      (e) => e instanceof AuditError && e.code === 'INVALID_DETAILS'
    );
  }
  assert.strictEqual(db.rows.length, 0);
});

test('yanlış sonuç, eksik zorunlu alan ve geçersiz kimlikler reddedilir', async () => {
  const { audit } = setup();
  await assert.rejects(() => audit.append({ action: 'FILE_ACCESS_DENIED', result: 'SUCCESS', fileId: f1, details: { attempted_action: 'READ', reason: 'NO_PERMISSION' } }), (e) => e.code === 'INVALID_RESULT');
  await assert.rejects(() => audit.append({ action: 'FILE_DOWNLOADED', result: 'DENIED', actorUserId: u1, fileId: f1 }), (e) => e.code === 'INVALID_RESULT');
  await assert.rejects(() => audit.logFileShared({ actorUserId: u1, fileId: f1 }), (e) => e.code === 'INVALID_DETAILS'); // target yok
  await assert.rejects(() => audit.logAccessDenied({ fileId: f1, attemptedAction: 'READ' }), (e) => e.code === 'INVALID_DETAILS'); // reason yok
  await assert.rejects(() => audit.logFileDownloaded({ actorUserId: u1, fileId: 'abc' }), (e) => e.code === 'INVALID_FILE');
  await assert.rejects(() => audit.logFileDownloaded({ actorUserId: 'abc', fileId: f1 }), (e) => e.code === 'INVALID_ACTOR');
  await assert.rejects(() => audit.logFileDownloaded({ fileId: f1 }), (e) => e.code === 'INVALID_ACTOR');
  await assert.rejects(() => audit.append({ action: 'BILINMEYEN', result: 'SUCCESS', actorUserId: u1, fileId: f1 }), (e) => e.code === 'INVALID_ACTION');
});

// ---------- Kurcalama tespiti ----------

async function filled() {
  const ctx = setup();
  await ctx.audit.logFileShared({ actorUserId: u1, fileId: f1, targetUserId: u2, permissions: { read: true } });
  await ctx.audit.logFileDownloaded({ actorUserId: u2, fileId: f1, sizeBytes: 100 });
  await ctx.audit.logAccessDenied({ actorUserId: u2, fileId: f2, attemptedAction: 'DOWNLOAD', reason: 'NO_PERMISSION' });
  await ctx.audit.logPermissionRevoked({ actorUserId: u1, fileId: f1, targetUserId: u2 });
  return ctx;
}

test('kayıt alanları değiştirilirse ENTRY_HASH_MISMATCH ve doğru id bulunur', async () => {
  const mutations = [
    (r) => { r.action = 'FILE_SHARED'; },
    (r) => { r.result = 'FAILURE'; },
    (r) => { r.details.size_bytes = 999999; },
    (r) => { r.details.actor_user_id = u1; },
    (r) => { r.created_at = new Date(r.created_at.getTime() + 1); },
  ];
  for (const mutate of mutations) {
    const { db, audit } = await filled();
    mutate(db.rows[1]); // 2. kayıt
    const res = await audit.verifyChain();
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.reason, 'ENTRY_HASH_MISMATCH');
    assert.strictEqual(res.firstInvalidId, '2');
  }
});

test('ortadan kayıt silinirse PREVIOUS_HASH_MISMATCH', async () => {
  const { db, audit } = await filled();
  db.rows.splice(1, 1);
  const res = await audit.verifyChain();
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.reason, 'PREVIOUS_HASH_MISMATCH');
  assert.strictEqual(res.firstInvalidId, '3');
});

test('kayıtların sırası değiştirilirse tespit edilir', async () => {
  const { db, audit } = await filled();
  [db.rows[1], db.rows[2]] = [db.rows[2], db.rows[1]];
  assert.strictEqual((await audit.verifyChain()).valid, false);
});

test('saldırgan bir kaydın hash\'ini yeniden hesaplasa bile sonraki kayıtta zincir kopar', async () => {
  const { db, audit } = await filled();
  const r = db.rows[1];
  r.details.size_bytes = 999999;
  r.entry_hash = computeEntryHash({
    previousHash: r.previous_hash, action: r.action, result: r.result, details: r.details, createdAt: r.created_at,
  });
  const res = await audit.verifyChain();
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.reason, 'PREVIOUS_HASH_MISMATCH');
  assert.strictEqual(res.firstInvalidId, '3');
});

test('FK ON DELETE SET NULL: sütunlar NULL olunca zincir bozulmaz', async () => {
  const { db, audit } = await filled();
  for (const r of db.rows) { if (r.file_id === f1) r.file_id = null; if (r.actor_user_id === u2) r.actor_user_id = null; }
  const res = await audit.verifyChain();
  assert.strictEqual(res.valid, true);
  assert.strictEqual(db.rows[0].details.file_id, f1); // kopya hâlâ duruyor
});

test('sütun başka bir kimliğe değiştirilirse COLUMN_MISMATCH', async () => {
  const { db, audit } = await filled();
  db.rows[1].actor_user_id = u1; // gerçekte u2 idi
  const res = await audit.verifyChain();
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.reason, 'COLUMN_MISMATCH');
  assert.strictEqual(res.firstInvalidId, '2');
});

test('sondan kayıt silme: expectedLastHash ile yakalanır', async () => {
  const { db, audit } = await filled();
  const { lastHash } = await audit.verifyChain();
  db.rows.pop();
  assert.strictEqual((await audit.verifyChain()).valid, true); // tek başına zincir fark etmez
  const res = await audit.verifyChain({ expectedLastHash: lastHash });
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.reason, 'LAST_HASH_MISMATCH');
});

test('HMAC: doğru anahtarla geçerli, yanlış anahtarla ve anahtarsız geçersiz', async () => {
  const key = crypto.randomBytes(32);
  const db = fakePg();
  const audit = createAuditLogger({ db, hmacKey: key, now: fixedClock() });
  await audit.logFileDownloaded({ actorUserId: u1, fileId: f1, sizeBytes: 1 });
  await audit.logFileDownloaded({ actorUserId: u1, fileId: f1, sizeBytes: 2 });
  assert.strictEqual((await audit.verifyChain()).valid, true);
  assert.strictEqual((await createAuditLogger({ db, hmacKey: crypto.randomBytes(32) }).verifyChain()).valid, false);
  assert.strictEqual((await createAuditLogger({ db }).verifyChain()).valid, false);
});

// ---------- Eşzamanlılık ve hata durumu ----------

test('25 eşzamanlı ekleme zinciri çatallamaz', async () => {
  const { db, audit } = setup();
  await Promise.all(Array.from({ length: 25 }, (_, i) =>
    audit.logFileDownloaded({ actorUserId: u1, fileId: f1, sizeBytes: i })));
  assert.strictEqual(db.rows.length, 25);
  assert.strictEqual(new Set(db.rows.map((r) => r.previous_hash)).size, 25); // her önceki hash tek kez kullanıldı
  const res = await audit.verifyChain();
  assert.deepStrictEqual({ valid: res.valid, checked: res.checked }, { valid: true, checked: 25 });
});

test('INSERT hata verirse ROLLBACK yapılır, kilit serbest kalır ve zincir sağlam kalır', async () => {
  const { db, audit } = setup({ pg: { failNextInsert: true } });
  await assert.rejects(() => audit.logFileDownloaded({ actorUserId: u1, fileId: f1, sizeBytes: 1 }), /insert hatası/);
  assert.strictEqual(db.state.rollbacks, 1);
  await audit.logFileDownloaded({ actorUserId: u1, fileId: f1, sizeBytes: 2 }); // kilitte takılmaz
  const res = await audit.verifyChain();
  assert.deepStrictEqual({ valid: res.valid, checked: res.checked }, { valid: true, checked: 1 });
});
