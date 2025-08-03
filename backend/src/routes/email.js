const { Router } = require("express");

const emailRouter = Router();
const { v4: uuidv4 } = require("uuid");
const { conn } = require("../config/database");

emailRouter.post("/generate-email", (req, res) => {
    const { website, id } = req.body;
    console.log(id);

    if (!website) {
        return res.status(400).json({ error: "Missing website parameter." });
    }

    const match = website.match(/^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?(?:[\w-]+\.)*?([\w-]+\.(?:com|org|net|edu|gov|co\.uk|co\.in|in|au|io|dev|me|info|biz|xyz|cc|us|ca|tv|news|app|ai))/i);

    if (!match) {
        return res.status(400).json({ error: "Invalid website URL." });
    }

    const domain = match[1];

    try {
        // 🔍 Step 1: Check if domain already exists
        const selectStmt = conn.prepare(
            `SELECT "email" FROM USER_WEB WHERE "website" = ? AND "id" = ?`
        );
        const existing = selectStmt.execute([domain, id]);


        if (existing.length > 0) {
            // ✅ Already registered
            return res.status(200).json({
                message: "Already registered",
                payload: {
                    email: existing[0].email,
                    website: domain,
                },
            });
        }

        // 🆕 Step 2: Register new email
        const uuid = uuidv4();
        const email = `${uuid}@maildrop.cc`;

        const insertQuery = `
            INSERT INTO USER_WEB ("id", "website", "email")
            VALUES (?, ?, ?)
        `;
        const values = [[id, domain, email]];
        const insertStmt = conn.prepare(insertQuery);

        insertStmt.execBatch(values, (dbErr) => {
            if (dbErr) {
                console.error("[HANA DB] Insert failed:", dbErr.message);
                return res.status(500).json({
                    error: "Database insert error",
                    details: dbErr.message,
                });
            }

            return res.status(200).json({
                message: "Email registered successfully",
                payload: { email, website: domain },
            });
        });
    } catch (err) {
        console.error("[HANA DB] Error:", err.message);
        return res.status(500).json({
            error: "Internal server error",
            details: err.message,
        });
    }
});

emailRouter.post("/get-email", (req, res) => {
    const id = req.body.id;
    console.log(id);
    if (!id) {
        return res.status(400).json({ error: "Missing ID parameter." });
    }
    const selectQuery = `
    SELECT * FROM USER_WEB WHERE "id" = ?
`;
    try {
        const stmt = conn.prepare(selectQuery);
        const result = stmt.execute([id]);
        if (result.length > 0) {
            res.status(200).json({ data: result });
        } else {
            res.status(404).json({ error: "Email not found for the given website." });
        }
    } catch (err) {
        console.error("[HANA DB] Preparation error:", err.message);
        res.status(500).json({
            error: "Internal server error",
            details: err.messages,
        });
    }
});



module.exports = emailRouter;
