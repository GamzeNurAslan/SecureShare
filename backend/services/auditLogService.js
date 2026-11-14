const crypto = require("crypto");

function stableStringify(value) {
    if (value === undefined) return "null";

    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
    }

    return `{${Object.keys(value)
        .sort()
        .map(
            (key) =>
                `${JSON.stringify(key)}:${stableStringify(value[key])}`
        )
        .join(",")}}`;
}

async function writeAuditLog({
    db,
    actorUserId = null,
    fileId = null,
    action,
    result,
    details = {},
}) {
    try {
        const previousResult = await db.query(
            `SELECT entry_hash
             FROM audit_logs
             ORDER BY id DESC
             LIMIT 1`
        );

        const previousHash =
            previousResult.rows[0]?.entry_hash || null;

        const createdAt = new Date().toISOString();

        const payload = {
            actorUserId,
            fileId,
            action,
            result,
            details,
            previousHash,
            createdAt,
        };

        const entryHash = crypto
            .createHash("sha256")
            .update(stableStringify(payload))
            .digest("hex");

        await db.query(
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
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
                actorUserId,
                fileId,
                action,
                result,
                details,
                previousHash,
                entryHash,
                createdAt,
            ]
        );

        return {
            previousHash,
            entryHash,
        };
    } catch (error) {
        console.error("Audit log yazma hatası:", error.message);
        return null;
    }
}

module.exports = {
    writeAuditLog,
};