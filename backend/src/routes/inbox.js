const axios = require("axios");
const { Router } = require("express");
const FlaggedSite = require("../models/FlaggedSite");
const { authenticateToken } = require("./auth");

const inboxRoute = Router();

const Email = require("../models/Email");

inboxRoute.post('/check-inbox', authenticateToken, async (req, res) => {
    const { email, website } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Missing email' });
    }

    try {
        // Fetch emails from database
        const emails = await Email.find({ userEmail: email }).sort({ receivedAt: -1 });

        // Map to the format expected by frontend (similar to maildrop response)
        const inbox = emails.map(e => ({
            id: e.mailId,
            headerfrom: e.sender,
            subject: e.subject,
            date: e.receivedAt
        }));

        var flag = 0;
        if (inbox.length > 0 && website) {
            const websiteLower = website.toLowerCase();
            for (const mail of inbox) {
                // Extract the part just before the last dot from the website
                const websiteParts = websiteLower.split('.');
                let keyword = '';
                if (websiteParts.length > 1) {
                    keyword = websiteParts[websiteParts.length - 2];
                } else {
                    keyword = websiteLower;
                }
                if (
                    typeof mail.headerfrom === 'string' &&
                    !mail.headerfrom.toLowerCase().includes(keyword)
                ) {
                    flag = 1;
                }
            }
        }

        if (flag > 0 && website) {
            try {
                const existingFlaggedSite = await FlaggedSite.findOne({ website_address: website });
                if (!existingFlaggedSite) {
                    // If site is not flagged, create a new entry
                    const newFlaggedSite = new FlaggedSite({
                        website_address: website,
                        flags: flag,
                        email: email
                    });
                    await newFlaggedSite.save();
                } else {
                    // If site is already flagged, increment the flag count
                    await FlaggedSite.updateOne({ website_address: website }, { $inc: { flags: 1 } });
                }
            } catch (dbErr) {
                console.error('Database error:', dbErr.message);
            }
        }

        // Construct response structure matching the original API
        const responseData = {
            data: {
                inbox: inbox
            }
        };

        res.status(200).json({ email: email + "@maildrop.cc", data: responseData, flag });

    } catch (error) {
        console.error('Error fetching emails from DB:', error.message);
        res.status(500).json({
            error: 'Failed to fetch emails',
            details: error.message
        });
    }
});

inboxRoute.post('/specific-email', authenticateToken, async (req, res) => {
    const { email, id } = req.body;

    if (!email || !id) {
        return res.status(400).json({ error: 'Missing email parameter or id.' });
    }

    try {
        const emailDoc = await Email.findOne({ mailId: id });

        if (!emailDoc) {
            return res.status(404).json({ error: 'Email not found' });
        }

        // Construct response structure matching the original API
        const responseData = {
            data: {
                message: {
                    id: emailDoc.mailId,
                    html: emailDoc.content, // We stored content in 'content' field
                    // data: emailDoc.content // Some parts might expect 'data'
                }
            }
        };

        res.status(200).json({ email: email + "@maildrop.cc", data: responseData });
    } catch (error) {
        console.error('Error fetching specific email from DB:', error.message);
        res.status(500).json({
            error: 'Failed to fetch specific email',
            details: error.message
        });
    }
});

inboxRoute.post('/check-flagged', async (req, res) => {
    const { website } = req.body;

    if (!website) {
        return res.status(400).json({ error: 'Missing website parameter.' });
    }

    const match = website.match(/^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?(?:[\w-]+\.)*?([\w-]+\.(?:com|org|net|edu|gov|co\.uk|co\.in|in|au|io|dev|me|info|biz|xyz|cc|us|ca|tv|news|app|ai))/i);

    const domain = match[1];
    console.log("Main domain:", domain);

    try {
        const flaggedSite = await FlaggedSite.findOne({ website_address: domain });
        if (!flaggedSite) {
            return res.status(200).json({ flagged: false, message: 'Site is not flagged.' });
        } else {
            return res.status(200).json({ flagged: true, message: 'Site is flagged.' });
        }
    } catch (dbErr) {
        console.error('Database select error:', dbErr.message);
        return res.status(500).json({ error: 'Database select error' });
    }
});

module.exports = inboxRoute;