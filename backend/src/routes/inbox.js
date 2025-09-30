const axios = require("axios");
const { Router } = require("express");
const FlaggedSite = require("../models/FlaggedSite");
const { authenticateToken } = require("./auth");

const inboxRoute = Router();

inboxRoute.post('/check-inbox', authenticateToken, async (req, res) => {
    const { email, website } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Missing email' });
    }


    const url = 'https://api.maildrop.cc/graphql';
    const data = {
        query: `query Example { inbox(mailbox:"${email}") { id headerfrom subject } }`
    };

    try {

        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        let flag = 0;
        const inbox = response.data?.data?.inbox || [];
        if (inbox.length > 0 && website) {
            const websiteLower = website.toLowerCase();
            var api_stmp = process.env.SMTP_SERVER;
            for (const mail of inbox) {
                if (typeof mail.headerfrom === 'string' && !mail.headerfrom.toLowerCase().includes(websiteLower)) {
                    flag = flag + 1;
                    console.log(`Mail from ${mail.headerfrom} not contain the website ${website}`);
                }
            }
        }

        if (flag > 0 && website) {
            try {
                const existingFlaggedSite = await FlaggedSite.findOne({ website_address: website });
                if (!existingFlaggedSite) {
                    const newFlaggedSite = new FlaggedSite({
                        website_address: website,
                        flags: flag,
                        email: email
                    });
                    await newFlaggedSite.save();
                }
            } catch (dbErr) {
                console.error('Database error:', dbErr.message);
            }
        }

        // Send the Maildrop API's response back to the client that visited '/'
        res.status(200).json({ email: email + "@maildrop.cc", data: response.data, flag });
    } catch (error) {
        console.error('Error fetching data from Maildrop.cc:', error.message);
        // Provide a more user-friendly error response
        res.status(500).json({
            error: 'Failed to fetch data from Maildrop.cc',
            details: error.response ? error.response.data : error.message
        });
    }
});

inboxRoute.post('/specific-email', authenticateToken, async (req, res) => {
    const { email, id } = req.body;

    if (!email || !id) {
        return res.status(400).json({ error: 'Missing email parameter or .' });
    }

    console.log(email, id);

    const url = 'https://api.maildrop.cc/graphql';
    const data = {
        query: `query Example { message(mailbox:"${email}", id:"${id}") { id html data } }`
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json({ email: email + "@maildrop.cc", data: response.data });
    } catch (error) {
        console.error('Error fetching specific email from Maildrop.cc:', error.message);
        res.status(500).json({
            error: 'Failed to fetch specific email from Maildrop.cc',
            details: error.response ? error.response.data : error.message
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