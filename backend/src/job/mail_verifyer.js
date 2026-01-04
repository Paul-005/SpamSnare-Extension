const axios = require('axios');
const FlaggedSite = require('../models/FlaggedSite');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const verifyFlaggedEmail = async (email, website) => {
    try {
        console.log(`[Verifier] Verify flagged email: ${email} for website: ${website}`);

        // 1. Fetch all emails from Maildrop
        const maildropUrl = 'https://api.maildrop.cc/graphql';
        const inboxQuery = `query { inbox(mailbox:"${email}") { id } }`;

        const inboxResponse = await axios.post(maildropUrl, { query: inboxQuery }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const inbox = inboxResponse.data?.data?.inbox || [];
        if (inbox.length === 0) {
            console.log('[Verifier] No emails found to verify.');
            return;
        }

        let emailContents = [];
        // Limit to last 10 emails
        const recentEmails = inbox.slice(0, 10);

        for (const mail of recentEmails) {
            // Check subject and sender
            const messageQuery = `query { message(mailbox:"${email}", id:"${mail.id}") { subject headerfrom } }`;
            try {
                const msgResponse = await axios.post(maildropUrl, { query: messageQuery }, {
                    headers: { 'Content-Type': 'application/json' }
                });
                const message = msgResponse.data?.data?.message;
                if (message) {
                    emailContents.push(`From: "${message.headerfrom}", Subject: "${message.subject}"`);
                }
            } catch (err) {
                console.error("[Verifier] Error fetching message details:", err.message);
            }
        }

        if (emailContents.length === 0) {
            console.log('[Verifier] Could not retrieve email contents.');
            return;
        }

        // 2. Call Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("[Verifier] GEMINI_API_KEY not found in environment.");
            return;
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const promptText = `
I am analyzing an email address that was generated specifically for the website "${website}". 
The user suspects this email address was sold or leaked because they are receiving emails from other sources (not ${website}). 
However, sometimes users use the same email for OTPs or verification on other sites explicitly (User Activity).

Here are the recent emails received at this address:
---
${emailContents.join('\n')}
---

Analyze these emails. 
1. If the emails look like they are from random services, spam, ads, newsletters, or totally unrelated to "${website}" and arguably shouldn't be there if the user only used it for "${website}", respond with "LEAK".
2. If the emails look like requested OTPs, verification codes, or services the user likely signed up for (like "Verify your email for X"), respond with "USER_ACTIVITY".

Respond ONLY with "LEAK" or "USER_ACTIVITY".
`;

        const geminiBody = {
            contents: [{
                parts: [{ text: promptText }]
            }]
        };

        const geminiResponse = await axios.post(geminiUrl, geminiBody);
        const resultText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();


        if (resultText === 'LEAK') {
            console.log(`[Verifier] ${website} is a leak for ${website}`);
            try {
                const existingFlaggedSite = await FlaggedSite.findOne({ website_address: website });
                if (!existingFlaggedSite) {
                    const newFlaggedSite = new FlaggedSite({
                        website_address: website,
                        flags: 1,
                        email: email
                    });
                    await newFlaggedSite.save();
                } else {
                    await FlaggedSite.updateOne({ website_address: website }, { $inc: { flags: 1 } });
                }
            } catch (dbErr) {
                console.error('[Verifier] Database error:', dbErr.message);
            }
        }
        if (resultText === 'USER_ACTIVITY') {
            console.log(`[Verifier] ${website} is a user activity for ${website}`);
        }

    } catch (error) {
        console.error('[Verifier] Error in verifyFlaggedEmail:', error.message);
        if (error.response) {
            console.error('[Verifier] Response error data:', error.response.data);
        }
    }
};

module.exports = { verifyFlaggedEmail };
