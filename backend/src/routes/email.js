const { Router } = require("express");

const authRouter = Router();
const { v4: uuidv4 } = require("uuid");
const { conn } = require("../config/database");

authRouter.post("/generate-email", (req, res) => {
    const { website } = req.body;

    if (!website) {
        return res.status(400).json({ error: "Missing website parameter." });
    }

    const match = website.match(
        /(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)*([a-z0-9-]+\.[a-z]{2,})(?=\/|$)/i
    );
    if (!match) {
        return res.status(400).json({ error: "Invalid website URL." });
    }

    const domain = match[1];

    try {
        // 🔍 Step 1: Check if domain already exists
        const selectStmt = conn.prepare(
            `SELECT "EMAIL" FROM USER_WEB WHERE "WEBSITE" = ?`
        );
        const existing = selectStmt.execute([domain]);

        console.log(existing);
        console.log(existing.length);

        if (existing.length > 0) {
            // ✅ Already registered
            return res.status(200).json({
                message: "Already registered",
                payload: {
                    email: existing[0].EMAIL,
                    website: domain,
                },
            });
        }

        // 🆕 Step 2: Register new email
        const uuid = uuidv4();
        const email = `${uuid}@maildrop.cc`;

        const insertQuery = `
            INSERT INTO USER_WEB ("WEBSITE", "EMAIL")
            VALUES (?, ?)
        `;
        const values = [[domain, email]];
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

authRouter.get("/get-email", (req, res) => {
    const selectQuery = `
    SELECT * FROM USER_WEB 
`;
    try {
        const stmt = conn.prepare(selectQuery);
        const result = stmt.exec();
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

module.exports = authRouter;
