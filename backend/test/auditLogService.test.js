const test = require("node:test");
const assert = require("node:assert/strict");

const {
    writeAuditLog,
} = require("../services/auditLogService");

function fakeDb() {
    const rows = [];

    return {
        rows,

        async query(text, params = []) {
            if (text.includes("SELECT entry_hash")) {
                const last = rows[rows.length - 1];

                return {
                    rows: last
                        ? [{ entry_hash: last.entry_hash }]
                        : [],
                };
            }

            if (text.includes("INSERT INTO audit_logs")) {
                const [
                    actorUserId,
                    fileId,
                    action,
                    result,
                    details,
                    previousHash,
                    entryHash,
                    createdAt,
                ] = params;

                const row = {
                    actorUserId,
                    fileId,
                    action,
                    result,
                    details,
                    previousHash,
                    entryHash,
                    createdAt,
                };

                rows.push(row);

                return {
                    rows: [row],
                };
            }

            throw new Error("Beklenmeyen sorgu");
        },
    };
}

test("audit log kaydı oluşturur ve hash zinciri kurar", async () => {
    const db = fakeDb();

    const first = await writeAuditLog({
        db,
        actorUserId: "user-1",
        fileId: "file-1",
        action: "FILE_SHARED",
        result: "SUCCESS",
        details: {
            targetUserId: "user-2",
            canRead: true,
            canDownload: false,
        },
    });

    assert.ok(first.entryHash);
    assert.equal(first.entryHash.length, 64);
    assert.equal(first.previousHash, null);

    const second = await writeAuditLog({
        db,
        actorUserId: "user-1",
        fileId: "file-1",
        action: "FILE_DOWNLOADED",
        result: "SUCCESS",
        details: {
            originalName: "test.txt",
            sizeBytes: 10,
        },
    });

    assert.ok(second.entryHash);
    assert.equal(second.entryHash.length, 64);
    assert.equal(second.previousHash, first.entryHash);
    assert.equal(db.rows.length, 2);
});