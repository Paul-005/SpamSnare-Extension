const axios = require("axios");
const { Router } = require("express");
const { conn } = require("../config/database");

const inboxRoute = Router();

inboxRoute.post('/check-inbox', async (req, res) => {
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
            for (const mail of inbox) {
                if (typeof mail.headerfrom === 'string' && !mail.headerfrom.toLowerCase().includes(websiteLower)) {
                    flag = flag + 1;
                    console.log(`Mail from ${mail.headerfrom} not contain the website ${website}`);
                }
            }
        }

        if (flag > 0 && website) {
            const insertQuery = "INSERT INTO spam_detected_sites (website_address, flags, user_id) VALUES (?, ?, ?)";
            const values = [[website, flag, email]];
            const stmt = conn.prepare(insertQuery);
            stmt.execBatch(values, function (dbErr) {
                if (dbErr) {
                    console.error('Database insert error:', dbErr.message);
                }
            });
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

inboxRoute.post('/specific-email', async (req, res) => {
    const { email, id } = req.body;

    if (!email || !id) {
        return res.status(400).json({ error: 'Missing email parameter or .' });
    }

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

    res.status(200).json({ email });
});

module.exports = inboxRoute;