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

const allowedTypes = {
    ".pdf": ["application/pdf"],
    ".png": ["image/png"],
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".txt": ["text/plain"],
    ".docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ".xlsx": [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        const extension = require("path")
            .extname(file.originalname)
            .toLowerCase();

        const allowedMimes = allowedTypes[extension];

        if (!allowedMimes || !allowedMimes.includes(file.mimetype)) {
            return cb(null, false);
        }

        cb(null, true);
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

function isDatabaseConnectionError(error) {
    const connectionCodes = [
        "ECONNREFUSED",
        "ECONNRESET",
        "ETIMEDOUT",
        "EHOSTUNREACH",
        "ENETUNREACH",
        "08000",
        "08003",
        "08006",
        "08001",
        "57P01",
        "57P02",
        "57P03",
        "53300",
    ];

    const code = error?.code || error?.cause?.code;

    return (
        connectionCodes.includes(code) ||
        error?.name === "ConnectionError"
    );
}

function isMinioConnectionError(error) {
    const connectionCodes = [
        "ECONNREFUSED",
        "ECONNRESET",
        "ETIMEDOUT",
        "ENOTFOUND",
        "EAI_AGAIN",
        "EHOSTUNREACH",
        "ENETUNREACH",
    ];

    const code = error?.code || error?.cause?.code;
    const statusCode = error?.statusCode || error?.cause?.statusCode;

    return (
        connectionCodes.includes(code) ||
        [502, 503, 504].includes(statusCode)
    );
}


function isMinioConnectionError(error) {
    const connectionCodes = [
        "ECONNREFUSED",
        "ECONNRESET",
        "ETIMEDOUT",
        "ENOTFOUND",
        "EAI_AGAIN",
        "EHOSTUNREACH",
        "ENETUNREACH",
    ];

    const code = error?.code || error?.cause?.code;
    const statusCode = error?.statusCode || error?.cause?.statusCode;

    return (
        connectionCodes.includes(code) ||
        [502, 503, 504].includes(statusCode)
    );
}

function sendOperationError(res, error, operation) {
    // Teknik detayları sadece sunucu loglarında tut.
    console.error(`${operation} hatası:`, {
        message: error?.message,
        code: error?.code,
        statusCode: error?.statusCode,
    });

    if (isDatabaseConnectionError(error)) {
        return res.status(503).json({
            error: "Veritabanı hizmetine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.",
            code: "DATABASE_UNAVAILABLE",
        });
    }

    if (isMinioConnectionError(error)) {
        return res.status(503).json({
            error: "Dosya depolama hizmetine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.",
            code: "STORAGE_UNAVAILABLE",
        });
    }

    return res.status(500).json({
        error: `${operation} işlemi sırasında sunucu hatası oluştu.`,
        code: "INTERNAL_ERROR",
    });
}

// POST /api/files

// POST /api/files
router.post("/", upload.single("file"), async (req, res) => {
    const db = req.app.locals.db;
    const storage = req.app.locals.storage;

    if (!db) {
        return res.status(503).json({
            error: "Veritabanı bağlantısı hazır değil.",
            code: "DATABASE_UNAVAILABLE",
        });
    }

    if (!storage) {
        return res.status(503).json({
            error: "MinIO bağlantısı hazır değil.",
            code: "STORAGE_UNAVAILABLE",
        });
    }

    if (!req.file) {
        return res.status(400).json({
            error: "Dosya seçilmedi veya dosya türü desteklenmiyor.",
        });
    }

    if (
        !req.file.originalname ||
        !req.file.originalname.trim() ||
        req.file.originalname.length > 255 ||
        req.file.size <= 0
    ) {
        return res.status(400).json({
            error: "Dosya adı veya dosya boyutu geçersiz.",
        });
    }

    const fileId = crypto.randomUUID();
    const objectKey = `files/${fileId}`;
    const aad = Buffer.from(`${fileId}:${req.user.id}`);

    let objectUploadAttempted = false;
    let metadataInsertAttempted = false;

    try {
        // 1. Dosyayı şifrele.
        const encrypted = encryptFile(
            req.file.buffer,
            loadKek(),
            aad
        );

        // 2. Şifreli dosyayı MinIO'ya yükle.
        // İşlem başarısız olsa bile kısmi nesneyi temizlemeyi deneyeceğiz.
        objectUploadAttempted = true;

        await storage.put(
            objectKey,
            encrypted.encryptedData
        );

        // 3. Dosya metadata bilgilerini veritabanına kaydet.
        metadataInsertAttempted = true;

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

        // 4. Başarılı yükleme işlemini audit log'a kaydet.
        await writeAuditLog({
            db,
            actorUserId: req.user.id,
            fileId,
            action: "FILE_UPLOADED",
            result: "SUCCESS",
            details: {
                originalName: req.file.originalname,
                sizeBytes: req.file.size,
                mimeType: req.file.mimetype,
            },
        });

        return res.status(201).json({
            message: "Dosya başarıyla yüklendi.",
            file: result.rows[0],
        });

    } catch (error) {

        console.error(
            "Dosya yükleme hatası:",
            error.message
        );

        // 5. Yükleme başarısızsa metadata kaydını temizle.
        // INSERT işleminin sonucu belirsiz olsa bile fileId ile
        // kayıt olup olmadığını kontrol ederek silmeyi deneriz.
        if (metadataInsertAttempted) {
            try {
                await db.query(
                    `DELETE FROM files
                     WHERE id = $1 AND owner_id = $2`,
                    [fileId, req.user.id]
                );

                console.log(
                    "Başarısız yüklemeye ait metadata temizlendi."
                );

            } catch (cleanupError) {
                console.error(
                    "Metadata temizleme hatası:",
                    cleanupError.message
                );
            }
        }

        // 6. MinIO nesnesini temizle.
        if (objectUploadAttempted) {
            try {
                await storage.remove(objectKey);

                console.log(
                    "Başarısız yüklemeye ait MinIO nesnesi temizlendi."
                );

            } catch (cleanupError) {
                console.error(
                    "MinIO nesne temizleme hatası:",
                    cleanupError.message
                );
            }
        }

        return sendOperationError(
            res,
            error,
            "Dosya yükleme"
        );
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
    }
    catch (error) {
        return sendOperationError(
            res,
            error,
            "Dosya listeleme"
        );
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
    }
    catch (error) {
        return sendOperationError(
            res,
            error,
            "Dosya paylaşım izni kaydetme"
        );
    }

});
// GET /api/files/users/search?q=email
// Kayıtlı kullanıcı arama
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
        return sendOperationError(
            res,
            error,
            "Kullanıcı arama"
        );
    }

});

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
    }
    catch (error) {
        return sendOperationError(
            res,
            error,
            "Dosya izinlerini listeleme"
        );
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
    }
    catch (error) {
        return sendOperationError(
            res,
            error,
            "Dosya erişim izni kaldırma"
        );
    }

});

// DELETE /api/files/:id
// Yalnızca dosya sahibi kendi dosyasını silebilir.
router.delete("/:id", async (req, res) => {
    const db = req.app.locals.db;
    const storage = req.app.locals.storage;
    const fileId = req.params.id;

    if (!UUID_RE.test(fileId)) {
        return res.status(400).json({
            error: "Geçersiz dosya kimliği.",
            code: "INVALID_FILE_ID",
        });
    }

    if (!db) {
        return res.status(503).json({
            error: "Veritabanı bağlantısı hazır değil.",
            code: "DATABASE_UNAVAILABLE",
        });
    }

    if (!storage) {
        return res.status(503).json({
            error: "MinIO bağlantısı hazır değil.",
            code: "STORAGE_UNAVAILABLE",
        });
    }

    let client;
    let backupData = null;
    let objectRemovalAttempted = false;
    let deletionCommitted = false;

    try {
        client = await db.connect();

        await client.query("BEGIN");

        // Dosyanın varlığını ve sahipliğini kontrol et.
        const fileResult = await client.query(
            `SELECT id, owner_id, original_name, object_key
             FROM files
             WHERE id = $1 AND owner_id = $2
             FOR UPDATE`,
            [fileId, req.user.id]
        );

        if (fileResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Dosya bulunamadı veya silme yetkiniz yok.",
                code: "FILE_NOT_FOUND",
            });
        }

        const file = fileResult.rows[0];

        // Silme öncesinde şifreli nesnenin yedeğini al.
        backupData = await storage.get(file.object_key);

        // Önce MinIO nesnesini sil.
        objectRemovalAttempted = true;

        await storage.remove(file.object_key);

        // Dosyanın paylaşım izinlerini sil.
        await client.query(
            `DELETE FROM file_permissions
             WHERE file_id = $1`,
            [fileId]
        );

        // Dosyanın metadata kaydını sil.
        const deleteResult = await client.query(
            `DELETE FROM files
             WHERE id = $1 AND owner_id = $2
             RETURNING id`,
            [fileId, req.user.id]
        );

        if (deleteResult.rows.length === 0) {
            throw new Error("Dosya metadata kaydı silinemedi.");
        }

        await client.query("COMMIT");
        deletionCommitted = true;

        // Dosya silindiği için audit kaydında fileId null tutulur.
        // Silinen dosyanın kimliği details içerisinde korunur.
        let auditLogRecorded = true;

        try {
            await writeAuditLog({
                db,
                actorUserId: req.user.id,
                fileId: null,
                action: "FILE_DELETED",
                result: "SUCCESS",
                details: {
                    deletedFileId: file.id,
                    originalName: file.original_name,
                },
            });
        } catch (auditError) {
            auditLogRecorded = false;

            console.error(
                "Dosya silme audit log hatası:",
                auditError.message
            );
        }

        return res.status(200).json({
            message: "Dosya başarıyla silindi.",
            fileId: file.id,
            auditLogRecorded,
        });

    } catch (error) {

        if (client && !deletionCommitted) {
            await client.query("ROLLBACK").catch(() => { });
        }

        // Veritabanı işlemi başarısızsa MinIO nesnesini geri yüklemeyi dene.
        if (objectRemovalAttempted && backupData && !deletionCommitted) {
            try {
                await storage.put(
                    (await db.query(
                        `SELECT object_key
                         FROM files
                         WHERE id = $1 AND owner_id = $2`,
                        [fileId, req.user.id]
                    )).rows[0]?.object_key,
                    backupData
                );
            } catch (restoreError) {
                console.error(
                    "MinIO nesnesini geri yükleme hatası:",
                    restoreError.message
                );
            }
        }

        return sendOperationError(
            res,
            error,
            "Dosya silme"
        );

    } finally {
        if (client) {
            client.release();
        }
    }
});

// GET /api/files/:id/history
// Yalnızca dosyanın sahibi kendi dosyasının işlem geçmişini görebilir.
router.get("/:id/history", async (req, res) => {
    const db = req.app.locals.db;
    const fileId = req.params.id;

    if (!UUID_RE.test(fileId)) {
        return res.status(400).json({
            error: "Geçersiz dosya kimliği.",
        });
    }

    const limit = Math.min(
        Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
        100
    );

    const offset = Math.max(
        Number.parseInt(req.query.offset, 10) || 0,
        0
    );

    try {
        const file = await findOwnedFile(
            db,
            fileId,
            req.user.id
        );

        if (!file) {
            return res.status(404).json({
                error: "Dosya bulunamadı veya geçmişini görüntüleme yetkiniz yok.",
            });
        }

        const result = await db.query(
            `SELECT
                a.id,
                a.actor_user_id,
                u.email AS actor_email,
                a.action,
                a.result,
                a.details,
                a.previous_hash,
                a.entry_hash,
                a.created_at
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.actor_user_id
             WHERE a.file_id = $1
             ORDER BY a.id DESC
             LIMIT $2 OFFSET $3`,
            [fileId, limit, offset]
        );

        return res.json({
            history: result.rows,
            limit,
            offset,
        });
    } catch (error) {
        return sendOperationError(
            res,
            error,
            "Dosya geçmişi getirme"
        );
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
    }
    catch (error) {
        return sendOperationError(
            res,
            error,
            "Dosya görüntüleme"
        );
    }

});

module.exports = router;
