// Ortak audit log modülü: audit_logs tablosuna hash zincirli kayıt ekler ve zinciri doğrular.
//
// Kayıt edilen olaylar:
//   FILE_SHARED, FILE_PERMISSION_REVOKED, FILE_DOWNLOADED, FILE_ACCESS_DENIED
//
// Hash zinciri yöntemi (ayrıntı: docs/audit-log.md):
//   previous_hash = bir önceki kaydın entry_hash'i (ilk kayıtta 64 sıfır, GENESIS_HASH)
//   entry_hash    = SHA-256( kanonik JSON [sürüm, previous_hash, action, result, details, created_at] )
//                   (AUDIT_HMAC_KEY verilirse HMAC-SHA-256)
//   actor_user_id ve file_id, hash'e `details` içindeki kopyalarıyla girer. Çünkü şemada bu iki
//   sütun ON DELETE SET NULL; kullanıcı/dosya silinince sütun NULL olur ama hash bozulmamalıdır.

const crypto = require('crypto');

const ACTIONS = Object.freeze({
  FILE_SHARED: 'FILE_SHARED',
  FILE_PERMISSION_REVOKED: 'FILE_PERMISSION_REVOKED',
  FILE_DOWNLOADED: 'FILE_DOWNLOADED',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
});

const RESULTS = Object.freeze({ SUCCESS: 'SUCCESS', FAILURE: 'FAILURE', DENIED: 'DENIED' });

const HASH_VERSION = 'secureshare-audit-v1';
const GENESIS_HASH = '0'.repeat(64);
const CHAIN_LOCK_KEY = 726300101; // pg_advisory_xact_lock için sabit anahtar (zinciri sıraya sokar)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class AuditError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AuditError';
    this.code = code;
  }
}

// ---------- Doğrulayıcılar: details içinde yalnızca bunlara izin verilir ----------
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);
const isBool = (v) => typeof v === 'boolean';
const isIsoOrNull = (v) => v === null || (typeof v === 'string' && !Number.isNaN(Date.parse(v)));
const isIp = (v) => typeof v === 'string' && v.length > 0 && v.length <= 64;
const isSize = (v) => Number.isSafeInteger(v) && v >= 0;
const oneOf = (...vals) => (v) => vals.includes(v);

const DETAIL_RULES = Object.freeze({
  FILE_SHARED: {
    target_user_id: isUuid, can_read: isBool, can_download: isBool,
    can_share: isBool, can_delete: isBool, expires_at: isIsoOrNull, ip: isIp,
  },
  FILE_PERMISSION_REVOKED: { target_user_id: isUuid, ip: isIp },
  FILE_DOWNLOADED: { size_bytes: isSize, ip: isIp },
  FILE_ACCESS_DENIED: {
    attempted_action: oneOf('READ', 'DOWNLOAD', 'SHARE', 'DELETE'),
    reason: oneOf('NO_PERMISSION', 'PERMISSION_EXPIRED'),
    ip: isIp,
  },
});

const REQUIRED_DETAILS = Object.freeze({
  FILE_SHARED: ['target_user_id'],
  FILE_PERMISSION_REVOKED: ['target_user_id'],
  FILE_DOWNLOADED: [],
  FILE_ACCESS_DENIED: ['attempted_action', 'reason'],
});

const ALLOWED_RESULTS = Object.freeze({
  FILE_SHARED: [RESULTS.SUCCESS, RESULTS.FAILURE],
  FILE_PERMISSION_REVOKED: [RESULTS.SUCCESS, RESULTS.FAILURE],
  FILE_DOWNLOADED: [RESULTS.SUCCESS],
  FILE_ACCESS_DENIED: [RESULTS.DENIED],
});

/** details'i doğrular; izin verilmeyen anahtar, hatalı değer veya eksik zorunlu alan varsa hata fırlatır. */
function normalizeDetails(action, details = {}) {
  const rules = DETAIL_RULES[action];
  const clean = {};
  for (const [key, value] of Object.entries(details)) {
    if (value === undefined) continue;
    if (!rules[key]) throw new AuditError(`details.${key} bu olay için izinli değil.`, 'INVALID_DETAILS');
    if (!rules[key](value)) throw new AuditError(`details.${key} geçersiz değer.`, 'INVALID_DETAILS');
    clean[key] = value;
  }
  for (const key of REQUIRED_DETAILS[action]) {
    if (!(key in clean)) throw new AuditError(`details.${key} zorunlu.`, 'INVALID_DETAILS');
  }
  return clean;
}

// ---------- Hash üretimi ----------

/** Anahtar sırasından bağımsız, deterministik JSON metni üretir. */
function canonicalize(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

function computeEntryHash({ previousHash, action, result, details, createdAt }, hmacKey = null) {
  const payload = canonicalize([
    HASH_VERSION, previousHash, action, result, details, new Date(createdAt).toISOString(),
  ]);
  return hmacKey
    ? crypto.createHmac('sha256', hmacKey).update(payload).digest('hex')
    : crypto.createHash('sha256').update(payload).digest('hex');
}

/** .env içindeki AUDIT_HMAC_KEY'i (en az 32 hex karakter) okur; tanımlı değilse null döner. */
function loadAuditHmacKey(env = process.env) {
  const hex = env.AUDIT_HMAC_KEY;
  if (!hex) return null;
  if (!/^[0-9a-fA-F]{32,}$/.test(hex)) {
    throw new AuditError('AUDIT_HMAC_KEY en az 32 karakterlik hex olmalı.', 'INVALID_KEY');
  }
  return Buffer.from(hex, 'hex');
}

// ---------- Ana fabrika ----------

/**
 * @param {object} opts
 * @param {object} opts.db       pg Pool (connect() ile bağlantı verebilen)
 * @param {Buffer} [opts.hmacKey] verilirse HMAC-SHA-256 kullanılır
 * @param {Function} [opts.now]  test için saat
 */
function createAuditLogger({ db, hmacKey = null, now = () => new Date() }) {
  if (!db || typeof db.connect !== 'function') throw new Error('db.connect() gerekli (pg Pool).');

  /** Genel ekleme fonksiyonu; olaya özel yardımcılar bunu çağırır. */
  async function append({ action, result, actorUserId = null, fileId, details = {} }) {
    if (!ACTIONS[action]) throw new AuditError('Bilinmeyen olay türü.', 'INVALID_ACTION');
    if (!ALLOWED_RESULTS[action].includes(result)) {
      throw new AuditError(`${action} için sonuç ${ALLOWED_RESULTS[action].join('/')} olmalı.`, 'INVALID_RESULT');
    }
    if (!isUuid(fileId)) throw new AuditError('fileId (UUID) zorunlu.', 'INVALID_FILE');
    if (actorUserId !== null && !isUuid(actorUserId)) throw new AuditError('actorUserId UUID olmalı.', 'INVALID_ACTOR');
    if (actorUserId === null && action !== ACTIONS.FILE_ACCESS_DENIED) {
      throw new AuditError('actorUserId zorunlu.', 'INVALID_ACTOR');
    }

    // Hash'e giren kayıt: izinli detaylar + kimlik kopyaları (sütunlar NULL olsa da doğrulanabilsin)
    const stored = { ...normalizeDetails(action, details), actor_user_id: actorUserId, file_id: fileId };
    const createdAt = now();

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      // Eşzamanlı eklemeler zinciri çatallamasın: aynı anda tek ekleme
      await client.query('SELECT pg_advisory_xact_lock($1)', [CHAIN_LOCK_KEY]);
      const last = await client.query('SELECT entry_hash FROM audit_logs ORDER BY id DESC LIMIT 1');
      const previousHash = (last.rows[0] && last.rows[0].entry_hash) || GENESIS_HASH;
      const entryHash = computeEntryHash({ previousHash, action, result, details: stored, createdAt }, hmacKey);

      const ins = await client.query(
        `INSERT INTO audit_logs
           (actor_user_id, file_id, action, result, details, previous_hash, entry_hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id`,
        [actorUserId, fileId, action, result, JSON.stringify(stored), previousHash, entryHash, createdAt]
      );
      await client.query('COMMIT');
      return { id: ins.rows[0].id, previousHash, entryHash };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  const toIso = (d) => (d == null ? null : new Date(d).toISOString());

  return {
    append,

    /** Dosya paylaşımı -> FILE_SHARED */
    logFileShared({ actorUserId, fileId, targetUserId, permissions = {}, expiresAt = null, ip, result = RESULTS.SUCCESS }) {
      return append({
        action: ACTIONS.FILE_SHARED, result, actorUserId, fileId,
        details: {
          target_user_id: targetUserId,
          can_read: !!permissions.read, can_download: !!permissions.download,
          can_share: !!permissions.share, can_delete: !!permissions.delete,
          expires_at: toIso(expiresAt), ip,
        },
      });
    },

    /** İzin kaldırma -> FILE_PERMISSION_REVOKED */
    logPermissionRevoked({ actorUserId, fileId, targetUserId, ip, result = RESULTS.SUCCESS }) {
      return append({
        action: ACTIONS.FILE_PERMISSION_REVOKED, result, actorUserId, fileId,
        details: { target_user_id: targetUserId, ip },
      });
    },

    /** Başarılı indirme -> FILE_DOWNLOADED */
    logFileDownloaded({ actorUserId, fileId, sizeBytes, ip }) {
      return append({
        action: ACTIONS.FILE_DOWNLOADED, result: RESULTS.SUCCESS, actorUserId, fileId,
        details: { size_bytes: sizeBytes, ip },
      });
    },

    /** Yetkisiz ya da süresi dolmuş izinle erişim -> FILE_ACCESS_DENIED */
    logAccessDenied({ actorUserId = null, fileId, attemptedAction, reason, ip }) {
      return append({
        action: ACTIONS.FILE_ACCESS_DENIED, result: RESULTS.DENIED, actorUserId, fileId,
        details: { attempted_action: attemptedAction, reason, ip },
      });
    },

    /**
     * Zinciri baştan sona doğrular.
     * @param {object} [opts]
     * @param {number} [opts.batchSize=500]
     * @param {string} [opts.expectedLastHash] dışarıda saklanan son hash; sondan silmeyi yakalar
     * @returns {{valid:boolean, checked:number, lastHash:string, firstInvalidId?:string, reason?:string}}
     */
    async verifyChain({ batchSize = 500, expectedLastHash } = {}) {
      let lastId = 0;
      let expectedPrev = GENESIS_HASH;
      let checked = 0;

      for (;;) {
        const res = await db.query(
          `SELECT id, actor_user_id, file_id, action, result, details, previous_hash, entry_hash, created_at
             FROM audit_logs WHERE id > $1 ORDER BY id ASC LIMIT $2`,
          [lastId, batchSize]
        );
        if (res.rows.length === 0) break;

        for (const row of res.rows) {
          const fail = (reason) => ({ valid: false, checked, firstInvalidId: String(row.id), reason, lastHash: expectedPrev });
          const details = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;

          if (row.previous_hash !== expectedPrev) return fail('PREVIOUS_HASH_MISMATCH');
          const recomputed = computeEntryHash({
            previousHash: row.previous_hash, action: row.action, result: row.result,
            details, createdAt: row.created_at,
          }, hmacKey);
          if (recomputed !== row.entry_hash) return fail('ENTRY_HASH_MISMATCH');

          // Sütunlar hash'e girmediği için, doldurulmuşsa details'taki kopyayla aynı olmalı.
          // NULL ise (FK ON DELETE SET NULL) kabul edilir.
          if (row.actor_user_id !== null && row.actor_user_id !== details.actor_user_id) return fail('COLUMN_MISMATCH');
          if (row.file_id !== null && row.file_id !== details.file_id) return fail('COLUMN_MISMATCH');

          expectedPrev = row.entry_hash;
          lastId = row.id;
          checked += 1;
        }
      }

      if (expectedLastHash !== undefined && expectedLastHash !== expectedPrev) {
        return { valid: false, checked, lastHash: expectedPrev, reason: 'LAST_HASH_MISMATCH' };
      }
      return { valid: true, checked, lastHash: expectedPrev };
    },
  };
}

module.exports = {
  ACTIONS, RESULTS, GENESIS_HASH, HASH_VERSION, AuditError,
  canonicalize, computeEntryHash, normalizeDetails, loadAuditHmacKey, createAuditLogger,
};
