
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');

const authMiddleware = require('../middleware/authMiddleware');

const {
    createMinioClientFromEnv,
    createStorage,
} = require('../storage/minioStorage');

const {
    loadKek,
    encryptFile,
    decryptFile,
} = require('../crypto/encryption');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024,
        files: 1,
    },
});

const bucket = process.env.MINIO_BUCKET || 'secureshare';

let storage;

function getStorage() {
    if (!storage) {
        storage = createStorage(
            createMinioClientFromEnv(),
            bucket
        );
    }

    return storage;
}

function isUuid(value) {
    return typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

router.use(authMiddleware);

// Dosya yükle
router.post('/', upload.single('file'), async (req, res, next) => {
    let objectKey;

    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Yüklenecek dosya gerekli. Form alanının adı file olmalı.',
            });
        }

        const db = req.app.locals.db;
        const userId = req.user.id;
        const fileId = crypto.randomUUID();
        objectKey = `${fileId}.enc`;

        const originalName = req.file.originalname
            .split(/[\\/]/)
            .pop()
            .replace(/[\r\n\0]/g, '_')
            .slice(0, 255);

        const aad = Buffer.from(`${fileId}:${userId}`, 'utf8');
        const encrypted = encryptFile(req.file.buffer, loadKek(), aad);
        const fileStorage = getStorage();

        await fileStorage.ensureBucket();
        await fileStorage.put(objectKey, encrypted.encryptedData);

        try {
            await db.query(
                `INSERT INTO files (
          id, owner_id, original_name, object_key,
          mime_type, size_bytes, encrypted_dek,
          nonce, aad, encryption_algorithm
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    fileId,
                    userId,
                    originalName,
                    objectKey,
                    req.file.mimetype || 'application/octet-stream',
                    req.file.size,
                    encrypted.encryptedDek,
                    encrypted.nonce,
                    encrypted.aad,
                    encrypted.algorithm,
                ]
            );
        } catch (error) {
            try {
                await fileStorage.remove(objectKey);
            } catch (cleanupError) {
                console.error('MinIO temizleme hatası:', cleanupError.message);
            }

            objectKey = undefined;
            throw error;
        }

        return res.status(201).json({
            message: 'Dosya şifrelenerek yüklendi.',
            file: {
                id: fileId,
                original_name: originalName,
                size_bytes: req.file.size,
                encryption_algorithm: encrypted.algorithm,
            },
        });
    } catch (error) {
        return next(error);
    } finally {
        if (req.file?.buffer) {
            req.file.buffer.fill(0);
        }
    }
});

// Kullanıcının görebildiği dosyaları listele
router.get('/', async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        const userId = req.user.id;

        const result = await db.query(
            `SELECT
         f.id,
         f.owner_id,
         f.original_name,
         f.mime_type,
         f.size_bytes,
         f.encryption_algorithm,
         f.created_at
       FROM files f
       WHERE f.owner_id = $1
          OR EXISTS (
            SELECT 1
            FROM file_permissions p
            WHERE p.file_id = f.id
              AND p.user_id = $1
              AND (p.expires_at IS NULL OR p.expires_at > NOW())
              AND (p.can_read = TRUE OR p.can_download = TRUE)
          )
       ORDER BY f.created_at DESC`,
            [userId]
        );

        return res.json({ files: result.rows });
    } catch (error) {
        return next(error);
    }
});

// Dosya indir
router.get('/:id/download', async (req, res, next) => {
    try {
        const db = req.app.locals.db;
        const userId = req.user.id;
        const fileId = req.params.id;

        if (!isUuid(fileId)) {
            return res.status(400).json({
                error: 'Dosya kimliği geçersiz.',
            });
        }

        const result = await db.query(
            `SELECT
         f.id,
         f.owner_id,
         f.original_name,
         f.object_key,
         f.encrypted_dek,
         f.nonce,
         f.aad,
         f.encryption_algorithm
       FROM files f
       WHERE f.id = $1
         AND (
           f.owner_id = $2
           OR EXISTS (
             SELECT 1
             FROM file_permissions p
             WHERE p.file_id = f.id
               AND p.user_id = $2
               AND p.can_download = TRUE
               AND (p.expires_at IS NULL OR p.expires_at > NOW())
           )
         )
       LIMIT 1`,
            [fileId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Dosya bulunamadı veya indirme izniniz yok.',
            });
        }

        const file = result.rows[0];

        if (file.encryption_algorithm !== 'AES-128-GCM') {
            return res.status(500).json({
                error: 'Desteklenmeyen şifreleme algoritması.',
            });
        }

        const encryptedData = await getStorage().get(file.object_key);

        const plaintext = decryptFile(
            {
                encryptedData,
                encryptedDek: file.encrypted_dek,
                nonce: file.nonce,
                aad: file.aad || Buffer.alloc(0),
            },
            loadKek()
        );

        const safeName = file.original_name
            .split(/[\\/]/)
            .pop()
            .replace(/[\r\n\0"]/g, '_');

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`
        );
        res.setHeader('Cache-Control', 'private, no-store');

        return res.send(plaintext);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
