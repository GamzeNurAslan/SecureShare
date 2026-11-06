# Audit log ve hash zinciri

Modül: `backend/audit/auditLog.js` · Tablo: `audit_logs` · Testler: `backend/test/auditLog.test.js`,
`backend/test/integration/auditLog.pg.integration.test.js`

## Kaydedilen olaylar

| `action` | `result` | Ne zaman | Zorunlu `details` |
|---|---|---|---|
| `FILE_SHARED` | `SUCCESS` / `FAILURE` | Dosya bir kullanıcıyla paylaşıldığında | `target_user_id` |
| `FILE_PERMISSION_REVOKED` | `SUCCESS` / `FAILURE` | Bir kullanıcının izni kaldırıldığında | `target_user_id` |
| `FILE_DOWNLOADED` | `SUCCESS` | Başarılı indirmede | yok |
| `FILE_ACCESS_DENIED` | `DENIED` | Yetkisiz ya da süresi dolmuş izinle erişimde | `attempted_action`, `reason` |

Sütunlar: `actor_user_id` (işlemi yapan), `file_id` (ilgili dosya), `action`, `result`, `details`, `created_at`.

`details` içinde **yalnızca** şu anahtarlara izin verilir, başkası hata verir:
`target_user_id`, `can_read`, `can_download`, `can_share`, `can_delete`, `expires_at`, `size_bytes`,
`attempted_action` (READ/DOWNLOAD/SHARE/DELETE), `reason` (NO_PERMISSION/PERMISSION_EXPIRED), `ip`.
Parola, anahtar (KEK/DEK), dosya içeriği ve dosya adı loglanmaz.

## Hash zinciri

- `previous_hash`: bir önceki kaydın `entry_hash` değeri. İlk kayıtta 64 sıfır (`GENESIS_HASH`).
- `entry_hash` = `SHA-256( canonicalize([ "secureshare-audit-v1", previous_hash, action, result, details, created_at ]) )`
  - `canonicalize`: anahtarları alfabetik sıralanmış, boşluksuz JSON. Dizi biçimi olduğu için alanlar birbirine karışamaz.
  - `created_at`: uygulama tarafından üretilen ISO-8601 (milisaniye) metni. Veritabanı varsayılanı kullanılmaz.
  - `AUDIT_HMAC_KEY` (.env, en az 32 hex karakter) tanımlıysa SHA-256 yerine **HMAC-SHA-256** kullanılır.
    Anahtar veritabanında olmadığı için veritabanına erişen biri zinciri yeniden hesaplayamaz. Anahtar
    ilk kayıttan önce belirlenmeli ve sonra değiştirilmemeli, kaybedilirse zincir doğrulanamaz.
- `actor_user_id` ve `file_id` hash'e `details` içindeki kopyalarıyla girer (modül bu kopyaları kendisi ekler).
  Nedeni: şemada bu sütunlar `ON DELETE SET NULL`; kullanıcı ya da dosya silinince sütun NULL olur.
  Sütunlar hash'e girseydi bu meşru silme zinciri bozardı. Doğrulama sırasında sütun doluysa kopyayla aynı
  olmalıdır, NULL ise kabul edilir.
- Eşzamanlı eklemeler `pg_advisory_xact_lock` ile sıraya sokulur; aksi halde iki kayıt aynı `previous_hash`'i
  alıp zinciri çatallayabilir. Ekleme tek işlemde yapılır, hata olursa geri alınır.

## Doğrulama

`audit.verifyChain()` kayıtları `id` sırasıyla gezer ve şunları kontrol eder:

| Hata | Anlamı |
|---|---|
| `PREVIOUS_HASH_MISMATCH` | Kayıt silinmiş, eklenmiş ya da sırası değişmiş |
| `ENTRY_HASH_MISMATCH` | Kaydın bir alanı değiştirilmiş |
| `COLUMN_MISMATCH` | `actor_user_id` / `file_id` sütunu, hash'li kopyayla uyuşmuyor |
| `LAST_HASH_MISMATCH` | Verilen `expectedLastHash` ile son hash farklı (sondan silme) |

`firstInvalidId`, ilk bozuk kaydın `id`'sini verir.

## Sınırlar

- Son kayıtların silinmesi zincirin kendisinden anlaşılmaz. Son `lastHash` değerini dışarıda (ör. günlük bir
  dosyada) saklayıp `verifyChain({ expectedLastHash })` ile karşılaştırmak gerekir.
- `AUDIT_HMAC_KEY` olmadan, veritabanı yöneticisi tüm zinciri yeniden hesaplayabilir. Canlıda HMAC önerilir.
- Log yazma hatası kendiliğinden yutulmaz, çağırana fırlatılır. Güvenlik açısından kritik akışlarda
  (örneğin indirme) log yazılamıyorsa işlemi başarısız saymak önerilir.

## Kullanım

```js
const { createAuditLogger, loadAuditHmacKey } = require('./audit/auditLog');
const audit = createAuditLogger({ db: pool, hmacKey: loadAuditHmacKey() }); // pool: pg Pool

await audit.logFileShared({ actorUserId, fileId, targetUserId, permissions: { read: true, download: true }, expiresAt, ip: req.ip });
await audit.logPermissionRevoked({ actorUserId, fileId, targetUserId, ip: req.ip });
await audit.logFileDownloaded({ actorUserId, fileId, sizeBytes, ip: req.ip });
await audit.logAccessDenied({ actorUserId, fileId, attemptedAction: 'DOWNLOAD', reason: 'NO_PERMISSION', ip: req.ip });

const result = await audit.verifyChain();   // { valid, checked, lastHash, firstInvalidId?, reason? }
```
