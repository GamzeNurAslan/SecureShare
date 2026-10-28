const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const {
  encryptFile,
  decryptFile,
  loadKek,
} = require("../crypto/encryption");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

function authenticateToken(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "JWT token gerekli.",
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      error: "JWT token geçersiz veya süresi dolmuş.",
    });
  }
}

router.post(
  "/",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
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
    const aad = Buffer.from(`${fileId}:${req.user.sub}`);
    const encrypted = encryptFile(
      req.file.buffer,
      loadKek(),
      aad
    );

    try {
      await storage.put(objectKey, encrypted.encryptedData);

      const result = await db.query(
        `
        INSERT INTO files (
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
        RETURNING id, original_name, mime_type, size_bytes, created_at
        `,
        [
          fileId,
          req.user.sub,
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

      res.status(201).json({
        message: "Dosya başarıyla yüklendi.",
        file: result.rows[0],
      });
    } catch (error) {
      await storage.remove(objectKey).catch(() => {});
      console.error("Dosya yükleme hatası:", error.message);

      res.status(500).json({
        error: "Dosya yüklenemedi.",
      });
    }
  }
);

router.get("/", authenticateToken, async (req, res) => {
  const db = req.app.locals.db;

  const result = await db.query(
    `
    SELECT DISTINCT
      f.id,
      f.original_name,
      f.mime_type,
      f.size_bytes,
      f.owner_id,
      f.created_at
    FROM files f
    LEFT JOIN file_permissions p
      ON p.file_id = f.id
      AND p.user_id = $1
      AND (p.expires_at IS NULL OR p.expires_at > NOW())
    WHERE f.owner_id = $1
       OR p.can_read = TRUE
       OR p.can_download = TRUE
    ORDER BY f.created_at DESC
    `,
    [req.user.sub]
  );

  res.json({
    files: result.rows,
  });
});

router.get("/:id", authenticateToken, async (req, res) => {
  const db = req.app.locals.db;
  const storage = req.app.locals.storage;

  if (!storage) {
    return res.status(503).json({
      error: "MinIO bağlantısı hazır değil.",
    });
  }

  const result = await db.query(
    `
    SELECT f.*
    FROM files f
    LEFT JOIN file_permissions p
      ON p.file_id = f.id
      AND p.user_id = $2
      AND (p.expires_at IS NULL OR p.expires_at > NOW())
    WHERE f.id = $1
      AND (f.owner_id = $2 OR p.can_download = TRUE)
    `,
    [req.params.id, req.user.sub]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: "Dosya bulunamadı veya indirme yetkiniz yok.",
    });
  }

  const file = result.rows[0];

  try {
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

    res.setHeader(
      "Content-Type",
      file.mime_type || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(
        file.original_name
      )}`
    );

    res.send(plainData);
  } catch (error) {
    console.error("Dosya indirme hatası:", error.message);

    res.status(500).json({
      error: "Dosya indirilemedi.",
    });
  }
});

module.exports = router;