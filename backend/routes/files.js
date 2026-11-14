const express = require("express");
const multer = require("multer");
const crypto = require("crypto");

const authMiddleware = require("../middleware/authMiddleware");

const {
    encryptFile,
    decryptFile,
    loadKek,
} = require("../crypto/encryption");

const {
    writeAuditLog,
} = require("../services/auditLogService");

const router = express.Router();

router.use(authMiddleware);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseExpirationDate(value) {
    if (value === undefined || value === null || value === "") {
        return { valid: true, date: null };
    }

    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    ) {
        return { valid: false, date: null };
    }

    const timestamp = Date.parse(value);

    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
        return { valid: false, date: null };
    }

    return {
        valid: true,
        date: new Date(timestamp),
    };
}

function validEmail(email) {
    return (
        typeof email === "string" &&
        email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    );
}

async function findOwnedFile(db, fileId, ownerId) {
    const result = await db.query(
        `SELECT id, owner_id
         FROM files
         WHERE id = $1 AND owner_id = $2`,
        [fileId, ownerId]
    );

    return result.rows[0] || null;
}

// POST /api/files
router.post("/", upload.single("file"), async (req, res) => {
    const db = req.app.locals.db;
    const storage = req.app.locals.storage;

    if (!storage) {
        return res.status(503).json({
            error: "MinIO bağlantısı hazır değil.",
        });
    }

    if (!req.file) {
        return res.status(400).json({
            error: "Yüklenecek dosya bulunamadı.",
        });
    }

    const fileId = crypto.randomUUID();
    const objectKey = `files/${fileId}`;
    const aad = Buffer.from(`${fileId}:${req.user.id}`);

    try {
        const encrypted = encryptFile(
            req.file.buffer,
            loadKek(),
            aad
        );

        await storage.put(
            objectKey,
            encrypted.encryptedData
        );

        const result = await db.query(
            `INSERT INTO files (
                id,
                owner_id,
                original_name,
                object_key,
                mime_type,
                size_bytes,
                encrypted_dek,
                nonce,
                aad,
                encryption_algorithm
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING id, original_name, mime_type, size_bytes, created_at`,
            [
                fileId,
                req.user.id,
                req.file.originalname,
                objectKey,
                req.file.mimetype,
                req.file.size,
                encrypted.encryptedDek,
                encrypted.nonce,
                encrypted.aad,
                encrypted.algorithm,
            ]
        );

        return res.status(201).json({
            message: "Dosya başarıyla yüklendi.",
            file: result.rows[0],
        });
    } catch (error) {
        await storage.remove(objectKey).catch(() => {});

        console.error(
            "Dosya yükleme hatası:",
            error.message
        );

        return res.status(500).json({
            error: "Dosya yüklenemedi.",
        });
    }
});

// GET /api/files
router.get("/", async (req, res) => {
    const db = req.app.locals.db;

    try {
        const result = await db.query(
            `SELECT DISTINCT
                f.id,
                f.original_name,
                f.mime_type,
                f.size_bytes,
                f.owner_id,
                f.created_at,
                COALESCE(p.can_read, FALSE) AS can_read,
                COALESCE(p.can_download, FALSE) AS can_download
             FROM files f
             LEFT JOIN file_permissions p
                ON p.file_id = f.id
                AND p.user_id = $1
                AND (
                    p.expires_at IS NULL
                    OR p.expires_at > NOW()
                )
             WHERE f.owner_id = $1
                OR p.can_read = TRUE
                OR p.can_download = TRUE
             ORDER BY f.created_at DESC`,
            [req.user.id]
        );

        return res.json({
            files: result.rows,
        });
    } catch (error) {
        console.error(
            "Dosya listeleme hatası:",
            error.message
        );

        return res.status(500).json({
            error: "Dosyalar listelenemedi.",
        });
    }
});

// POST /api/files/:id/permissions
router.post("/:id/permissions", async (req, res) => {
    const db = req.app.locals.db;

    if (!UUID_RE.test(req.params.id)) {
        return res.status(400).json({
            error: "Geçersiz dosya kimliği.",
        });
    }

    const {
        email,
        can_read,
        can_download,
        expires_at,
    } = req.body || {};

    if (
        !validEmail(email) ||
        typeof can_read !== "boolean" ||
        typeof can_download !== "boolean"
    ) {
        return res.status(400).json({
            error:
                "Geçerli email, can_read ve can_download (boolean) alanları zorunludur.",
        });
    }

    if (!can_read && !can_download) {
        return res.status(400).json({
            error: "En az bir erişim izni true olmalıdır.",
        });
    }

    const expiration = parseExpirationDate(expires_at);

    if (!expiration.valid) {
        return res.status(400).json({
            error:
                "expires_at geçerli bir ISO-8601 tarih olmalı ve gelecekte bulunmalıdır.",
        });
    }

    try {
        const file = await findOwnedFile(
            db,
            req.params.id,
            req.user.id
        );

        if (!file) {
            return res.status(404).json({
                error: "Dosya bulunamadı veya paylaşım yetkiniz yok.",
            });
        }

        const userResult = await db.query(
            `SELECT id, email
             FROM users
             WHERE LOWER(email) = LOWER($1)`,
            [email.trim()]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: "Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.",
            });
        }

        const targetUser = userResult.rows[0];

        if (targetUser.id === req.user.id) {
            return res.status(400).json({
                error: "Dosya sahibi dosyayı kendisiyle paylaşamaz.",
            });
        }

        const permissionResult = await db.query(
            `INSERT INTO file_permissions (
                file_id,
                user_id,
                can_read,
                can_download,
                expires_at,
                granted_by
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (file_id, user_id)
            DO UPDATE SET
                can_read = EXCLUDED.can_read,
                can_download = EXCLUDED.can_download,
                expires_at = EXCLUDED.expires_at,
                granted_by = EXCLUDED.granted_by
            RETURNING
                id,
                file_id,
                user_id,
                can_read,
                can_download,
                expires_at,
                granted_by,
                created_at`,
            [
                req.params.id,
                targetUser.id,
                can_read,
                can_download,
                expiration.date,
                req.user.id,
            ]
        );

        await writeAuditLog({
            db,
            actorUserId: req.user.id,
            fileId: req.params.id,
            action: "FILE_SHARED",
            result: "SUCCESS",
            details: {
                targetUserId: targetUser.id,
                targetEmail: targetUser.email,
                canRead: can_read,
                canDownload: can_download,
                expiresAt: expiration.date
                    ? expiration.date.toISOString()
                    : null,
            },
        });

        return res.status(200).json({
            message: "Dosya paylaşım izni kaydedildi.",
            user: {
                id: targetUser.id,
                email: targetUser.email,
            },
            permission: permissionResult.rows[0],
        });
    } catch (error) {
        console.error(
            "Dosya paylaşım izni hatası:",
            error.message
        );

        return res.status(500).json({
            error: "Dosya paylaşım izni kaydedilemedi.",
        });
    }
});
// --------------------------------------------------
// GET /api/files/users/search?q=email
// Kayıtlı kullanıcı arama
// --------------------------------------------------
router.get("/users/search", async (req, res) => {
    const db = req.app.locals.db;
    const query = String(req.query.q || "").trim();


    if (query.length < 3) {
        return res.status(400).json({
            error: "En az 3 karakter girin.",
        });
    }

    try {
        const result = await db.query(
            `SELECT id, email
             FROM users
             WHERE LOWER(email) LIKE LOWER($1)
             AND id <> $2
             ORDER BY email
             LIMIT 10`,
            [`%${query}%`, req.user.id]
        );

        return res.json({
            users: result.rows,
        });
    } catch (error) {
        console.error("Kullanıcı arama hatası:", error.message);

        return res.status(500).json({
            error: "Kullanıcılar aranamadı.",
        });
    }
});
// --------------------------------------------------

// GET /api/files/:id/permissions
router.get("/:id/permissions", async (req, res) => {
    const db = req.app.locals.db;

    if (!UUID_RE.test(req.params.id)) {
        return res.status(400).json({
            error: "Geçersiz dosya kimliği.",
        });
    }

    try {
        const file = await findOwnedFile(
            db,
            req.params.id,
            req.user.id
        );

        if (!file) {
            return res.status(404).json({
                error:
                    "Dosya bulunamadı veya izinleri görüntüleme yetkiniz yok.",
            });
        }

        const result = await db.query(
            `SELECT
                p.id,
                p.user_id,
                u.email,
                p.can_read,
                p.can_download,
                p.expires_at,
                p.granted_by,
                p.created_at
             FROM file_permissions p
             INNER JOIN users u ON u.id = p.user_id
             WHERE p.file_id = $1
             ORDER BY p.created_at DESC`,
            [req.params.id]
        );

        return res.json({
            permissions: result.rows,
        });
    } catch (error) {
        console.error(
            "İzin listeleme hatası:",
            error.message
        );

        return res.status(500).json({
            error: "Dosya izinleri listelenemedi.",
        });
    }
});

// DELETE /api/files/:id/permissions/:userId
router.delete("/:id/permissions/:userId", async (req, res) => {
    const db = req.app.locals.db;

    const {
        id: fileId,
        userId,
    } = req.params;

    if (!UUID_RE.test(fileId) || !UUID_RE.test(userId)) {
        return res.status(400).json({
            error: "Geçersiz dosya veya kullanıcı kimliği.",
        });
    }

    try {
        const file = await findOwnedFile(
            db,
            fileId,
            req.user.id
        );

        if (!file) {
            return res.status(404).json({
                error:
                    "Dosya bulunamadı veya izinleri değiştirme yetkiniz yok.",
            });
        }

        const result = await db.query(
            `DELETE FROM file_permissions
             WHERE file_id = $1 AND user_id = $2
             RETURNING user_id`,
            [fileId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Bu kullanıcıya ait izin kaydı bulunamadı.",
            });
        }

        await writeAuditLog({
            db,
            actorUserId: req.user.id,
            fileId,
            action: "FILE_PERMISSION_REVOKED",
            result: "SUCCESS",
            details: {
                targetUserId: userId,
            },
        });

        return res.json({
            message: "Dosya erişim izni kaldırıldı.",
            user_id: result.rows[0].user_id,
        });
    } catch (error) {
        console.error(
            "İzin kaldırma hatası:",
            error.message
        );

        return res.status(500).json({
            error: "Dosya erişim izni kaldırılamadı.",
        });
    }
});

// GET /api/files/:id/view
// Dosya sahibi ile okuma izni olan kullanıcılar için güvenli önizleme.
router.get("/:id/view", async (req, res) => {
    const db = req.app.locals.db;
    const storage = req.app.locals.storage;

    if (!UUID_RE.test(req.params.id)) {
        return res.status(400).json({
            error: "Geçersiz dosya kimliği.",
        });
    }

    if (!storage) {
        return res.status(503).json({
            error: "MinIO bağlantısı hazır değil.",
        });
    }

    try {
        const result = await db.query(
            `SELECT f.*
             FROM files f
             LEFT JOIN file_permissions p
                ON p.file_id = f.id
                AND p.user_id = $2
                AND (
                    p.expires_at IS NULL
                    OR p.expires_at > NOW()
                )
             WHERE f.id = $1
                AND (
                    f.owner_id = $2
                    OR p.can_read = TRUE
                    OR p.can_download = TRUE
                )`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            await writeAuditLog({
                db,
                actorUserId: req.user.id,
                fileId: null,
                action: "FILE_VIEW_DENIED",
                result: "DENIED",
                details: {
                    requestedFileId: req.params.id,
                    reason: "file_not_found_or_read_permission_missing",
                },
            });

            return res.status(404).json({
                error: "Dosya bulunamadı veya görüntüleme yetkiniz yok.",
            });
        }

        const file = result.rows[0];
        const encryptedData = await storage.get(file.object_key);
        const plainData = decryptFile(
            {
                encryptedData,
                encryptedDek: file.encrypted_dek,
                nonce: file.nonce,
                aad: file.aad,
            },
            loadKek()
        );

        await writeAuditLog({
            db,
            actorUserId: req.user.id,
            fileId: req.params.id,
            action: "FILE_VIEWED",
            result: "SUCCESS",
            details: {
                originalName: file.original_name,
                sizeBytes: Number(file.size_bytes),
            },
        });

        res.setHeader(
            "Content-Type",
            file.mime_type || "application/octet-stream"
        );
        res.setHeader(
            "Content-Disposition",
            `inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`
        );

        return res.send(plainData);
    } catch (error) {
        console.error("Dosya görüntüleme hatası:", error.message);

        return res.status(500).json({
            error: "Dosya görüntülenemedi.",
        });
    }
});

// GET /api/files/:id
router.get("/:id", async (req, res) => {
    const db = req.app.locals.db;
    const storage = req.app.locals.storage;

    if (!UUID_RE.test(req.params.id)) {
        return res.status(400).json({
            error: "Geçersiz dosya kimliği.",
        });
    }

    if (!storage) {
        return res.status(503).json({
            error: "MinIO bağlantısı hazır değil.",
        });
    }

    try {
        const result = await db.query(
            `SELECT f.*
             FROM files f
             LEFT JOIN file_permissions p
                ON p.file_id = f.id
                AND p.user_id = $2
                AND (
                    p.expires_at IS NULL
                    OR p.expires_at > NOW()
                )
             WHERE f.id = $1
                AND (
                    f.owner_id = $2
                    OR p.can_download = TRUE
                )`,
            [
                req.params.id,
                req.user.id,
            ]
        );

        if (result.rows.length === 0) {
            await writeAuditLog({
                db,
                actorUserId: req.user.id,
                fileId: null,
                action: "FILE_ACCESS_DENIED",
                result: "DENIED",
                details: {
                    requestedFileId: req.params.id,
                    reason:
                        "file_not_found_or_download_permission_missing",
                },
            });

            return res.status(404).json({
                error:
                    "Dosya bulunamadı veya indirme yetkiniz yok.",
            });
        }

        const file = result.rows[0];

        const encryptedData = await storage.get(
            file.object_key
        );

        const plainData = decryptFile(
            {
                encryptedData,
                encryptedDek: file.encrypted_dek,
                nonce: file.nonce,
                aad: file.aad,
            },
            loadKek()
        );

        await writeAuditLog({
            db,
            actorUserId: req.user.id,
            fileId: req.params.id,
            action: "FILE_DOWNLOADED",
            result: "SUCCESS",
            details: {
                originalName: file.original_name,
                sizeBytes: Number(file.size_bytes),
            },
        });

        res.setHeader(
            "Content-Type",
            file.mime_type ||
                "application/octet-stream"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename*=UTF-8''${encodeURIComponent(
                file.original_name
            )}`
        );

        return res.send(plainData);
    } catch (error) {
        console.error(
            "Dosya indirme hatası:",
            error.message
        );

        return res.status(500).json({
            error: "Dosya indirilemedi.",
        });
    }
});
// DELETE /api/files/:id
// Yalnızca dosya sahibi dosyayı silebilir.
router.delete("/:id", async (req, res) => {
    const db = req.app.locals.db;
    const storage = req.app.locals.storage;
    const fileId = req.params.id;

    if (!UUID_RE.test(fileId)) {
        return res.status(400).json({
            error: "Geçersiz dosya kimliği.",
        });
    }

    if (!storage) {
        return res.status(503).json({
            error: "MinIO bağlantısı hazır değil.",
        });
    }

    let client;
    let transactionStarted = false;
    let objectKey = null;
    let encryptedBackup = null;
    let objectRemoved = false;

    try {
        client = await db.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        // Dosyanın varlığını ve sahibini kontrol et.
        const result = await client.query(
            `SELECT id, object_key
             FROM files
             WHERE id = $1 AND owner_id = $2
             FOR UPDATE`,
            [fileId, req.user.id]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                error: "Dosya bulunamadı veya silme yetkiniz yok.",
            });
        }

        objectKey = result.rows[0].object_key;

        // Silme başarısız olursa geri yüklemek için şifreli yedeği al.
        encryptedBackup = await storage.get(objectKey);

        // Önce MinIO nesnesini sil.
        await storage.remove(objectKey);
        objectRemoved = true;

        // PostgreSQL metadata kaydını sil.
        // file_permissions kayıtları ON DELETE CASCADE ile silinir.
        await client.query(
            `DELETE FROM files
             WHERE id = $1 AND owner_id = $2`,
            [fileId, req.user.id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.json({
            message: "Dosya başarıyla silindi.",
            file_id: fileId,
        });

    } catch (error) {
        if (transactionStarted && client) {
            await client.query("ROLLBACK").catch(() => { });
        }

        // Veritabanı işlemi başarısızsa MinIO nesnesini geri yükle.
        if (objectRemoved && encryptedBackup && objectKey) {
            try {
                await storage.put(objectKey, encryptedBackup);
            } catch (restoreError) {
                console.error(
                    "MinIO geri yükleme hatası:",
                    restoreError.message
                );

                return res.status(500).json({
                    error: "Silme başarısız oldu. Dosyanın depolama durumu manuel kontrol edilmeli.",
                });
            }
        }

        console.error("Dosya silme hatası:", error.message);

        return res.status(500).json({
            error: "Dosya silinemedi.",
        });

    } finally {
        if (client) client.release();
    }
});
module.exports = router;
