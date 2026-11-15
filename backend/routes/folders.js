const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const { writeAuditLog } = require("../services/auditLogService");

const router = express.Router();

router.use(authMiddleware);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseParentFolderId(value) {
  if (value === undefined || value === null || value === "") {
    return { valid: true, folderId: null };
  }

  if (typeof value !== "string" || !UUID_RE.test(value)) {
    return { valid: false, folderId: null };
  }

  return { valid: true, folderId: value };
}

async function findOwnedFolder(db, folderId, ownerId) {
  const result = await db.query(
    `SELECT id, owner_id, parent_folder_id, name
     FROM folders
     WHERE id = $1 AND owner_id = $2`,
    [folderId, ownerId]
  );

  return result.rows[0] || null;
}

// GET /api/folders?parentFolderId=<uuid>
// parentFolderId verilmezse kök dizin listelenir.
router.get("/", async (req, res) => {
  const db = req.app.locals.db;
  const parent = parseParentFolderId(req.query.parentFolderId);

  if (!parent.valid) {
    return res.status(400).json({
      error: "Geçersiz üst klasör kimliği.",
    });
  }

  try {
    const [foldersResult, filesResult] = await Promise.all([
      db.query(
        `SELECT id, name, parent_folder_id, created_at, updated_at
         FROM folders
         WHERE owner_id = $1
           AND parent_folder_id IS NOT DISTINCT FROM $2
         ORDER BY name ASC`,
        [req.user.id, parent.folderId]
      ),
      db.query(
        `SELECT id, original_name, mime_type, size_bytes, folder_id, created_at
         FROM files
         WHERE owner_id = $1
           AND folder_id IS NOT DISTINCT FROM $2
         ORDER BY created_at DESC`,
        [req.user.id, parent.folderId]
      ),
    ]);

    return res.json({
      parent_folder_id: parent.folderId,
      folders: foldersResult.rows,
      files: filesResult.rows,
    });
  } catch (error) {
    console.error("Klasör listeleme hatası:", error.message);

    return res.status(500).json({
      error: "Klasörler listelenemedi.",
    });
  }
});

// POST /api/folders
router.post("/", async (req, res) => {
  const db = req.app.locals.db;
  const { name, parentFolderId } = req.body || {};
  const parent = parseParentFolderId(parentFolderId);

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 255
  ) {
    return res.status(400).json({
      error: "Klasör adı 1 ile 255 karakter arasında olmalıdır.",
    });
  }

  if (!parent.valid) {
    return res.status(400).json({
      error: "Geçersiz üst klasör kimliği.",
    });
  }

  try {
    if (parent.folderId) {
      const parentFolder = await findOwnedFolder(
        db,
        parent.folderId,
        req.user.id
      );

      if (!parentFolder) {
        return res.status(404).json({
          error: "Üst klasör bulunamadı veya bu klasöre erişim yetkiniz yok.",
        });
      }
    }

    const result = await db.query(
      `INSERT INTO folders (owner_id, parent_folder_id, name)
       VALUES ($1, $2, $3)
       RETURNING id, owner_id, parent_folder_id, name, created_at, updated_at`,
      [req.user.id, parent.folderId, name.trim()]
    );

    const folder = result.rows[0];

    await writeAuditLog({
      db,
      actorUserId: req.user.id,
      action: "FOLDER_CREATED",
      result: "SUCCESS",
      details: {
        folderId: folder.id,
        parentFolderId: folder.parent_folder_id,
        name: folder.name,
      },
    });

    return res.status(201).json({
      message: "Klasör oluşturuldu.",
      folder,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Bu klasörde aynı isimde bir klasör zaten var.",
      });
    }

    console.error("Klasör oluşturma hatası:", error.message);

    return res.status(500).json({
      error: "Klasör oluşturulamadı.",
    });
  }
});

module.exports = router;