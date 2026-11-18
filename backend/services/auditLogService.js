
const {
    computeEntryHash,
    GENESIS_HASH,
    loadAuditHmacKey,
} = require("../audit/auditLog");

const CHAIN_LOCK_KEY = 726300101;

async function writeAuditLog({
    db,
    actorUserId = null,
    fileId = null,
    action,
    result,
    details = {},
}) {
    if (!db || typeof db.connect !== "function") {
        throw new Error("Geçerli PostgreSQL Pool bağlantısı gerekli.");
    }

    if (!action || typeof action !== "string") {
        throw new Error("Audit log action alanı zorunludur.");
    }

    if (!result || typeof result !== "string") {
        throw new Error("Audit log result alanı zorunludur.");
    }

    if (!details || typeof details !== "object" || Array.isArray(details)) {
        throw new Error("Audit log details alanı geçersiz.");
    }

    const client = await db.connect();

    try {
        await client.query("BEGIN");

        // Bütün audit kayıtları aynı zincir kilidini kullanır.
        await client.query(
            "SELECT pg_advisory_xact_lock($1)",
            [CHAIN_LOCK_KEY]
        );

        // Önceki kaydın hash değerini al.
        const previousResult = await client.query(
            `SELECT entry_hash
             FROM audit_logs
             ORDER BY id DESC
             LIMIT 1`
        );

        const previousHash =
            previousResult.rows[0]?.entry_hash || GENESIS_HASH;

        const createdAt = new Date();

        // Kimlik bilgileri de hash'in içine dahil edilir.
        const storedDetails = {
            ...details,
            actor_user_id: actorUserId,
            file_id: fileId,
        };

        // Ortak audit modülündeki SHA-256/HMAC standardını kullan.
        const entryHash = computeEntryHash(
            {
                previousHash,
                action,
                result,
                details: storedDetails,
                createdAt,
            },
            loadAuditHmacKey()
        );

        const insertResult = await client.query(
            `INSERT INTO audit_logs (
                actor_user_id,
                file_id,
                action,
                result,
                details,
                previous_hash,
                entry_hash,
                created_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING id`,
            [
                actorUserId,
                fileId,
                action,
                result,
                JSON.stringify(storedDetails),
                previousHash,
                entryHash,
                createdAt,
            ]
        );

        await client.query("COMMIT");

        return {
            id: insertResult.rows[0].id,
            previousHash,
            entryHash,
            createdAt,
        };
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("Audit log kayıt hatası:", error.message);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    writeAuditLog,
};
