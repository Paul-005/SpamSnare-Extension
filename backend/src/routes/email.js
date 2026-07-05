const { Router } = require("express");
const { v4: uuidv4 } = require("uuid");
const { prisma } = require("../config/database");
const { authenticateToken } = require("./auth");

const emailRouter = Router();

emailRouter.post("/generate-email", authenticateToken, async (req, res) => {
    const { website } = req.body;
    const userId = req.user.userId; // Get user ID from JWT token

    if (!website) {
        return res.status(400).json({ error: "Missing website parameter." });
    }

    const match = website.match(/^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?(?:[\w-]+\.)*?([\w-]+\.(?:com|org|net|edu|gov|co\.uk|co\.in|in|au|io|dev|me|info|biz|xyz|cc|us|ca|tv|news|app|ai))/i);

    if (!match) {
        return res.status(400).json({ error: "Invalid website URL." });
    }

    const domain = match[1];

    try {
        // Check if domain already exists for this user using compound unique index
        const existing = await prisma.userWeb.findUnique({
            where: {
                userId_website: {
                    userId: userId,
                    website: domain
                }
            }
        });

        if (existing) {
            // ✅ Already registered
            return res.status(200).json({
                message: "Already registered",
                payload: {
                    email: existing.email,
                    website: domain,
                },
            });
        }

        // Register new email
        const uuid = uuidv4();
        const email = `${uuid}@maildrop.cc`;

        await prisma.userWeb.create({
            data: {
                userId: userId,
                website: domain,
                email: email
            }
        });

        await prisma.genEmail.create({
            data: {
                email: email,
                generatedAt: new Date()
            }
        });

        return res.status(200).json({
            message: "Email registered successfully",
            payload: { email, website: domain },
        });
    } catch (err) {
        console.error("[PostgreSQL] Error:", err.message);
        return res.status(500).json({
            error: "Internal server error",
            details: err.message,
        });
    }
});

emailRouter.get("/get-emails", authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Get user ID from JWT token

    try {
        const result = await prisma.userWeb.findMany({
            where: { userId: userId }
        });

        if (result.length > 0) {
            // Convert documents to response format
            const formattedResult = result.map(doc => ({
                userId: doc.userId,
                website: doc.website,
                email: doc.email,
                createdAt: doc.createdAt
            }));
            res.status(200).json({ data: formattedResult });
        } else {
            res.status(200).json({ data: [] });
        }
    } catch (err) {
        console.error("[PostgreSQL] Error:", err.message);
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
        });
    }
});

module.exports = emailRouter;
