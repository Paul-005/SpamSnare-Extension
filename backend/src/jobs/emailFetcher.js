const cron = require('node-cron');
const axios = require('axios');
const User = require('../models/User');
const Email = require('../models/Email');

const MAILDROP_API_URL = 'https://api.maildrop.cc/graphql';

async function fetchAndSaveEmails() {
    console.log('Starting email fetch job...');
    try {
        const users = await User.find({});
        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            const email = user.email;
            // Extract username from email (assuming maildrop uses the part before @)
            const mailbox = email.split('@')[0];

            console.log(`Fetching emails for ${email} (mailbox: ${mailbox})...`);

            try {
                // 1. Fetch Inbox
                const inboxQuery = {
                    query: `query { inbox(mailbox:"${mailbox}") { id headerfrom subject date } }`
                };

                const inboxResponse = await axios.post(MAILDROP_API_URL, inboxQuery, {
                    headers: { 'Content-Type': 'application/json' }
                });

                const messages = inboxResponse.data?.data?.inbox || [];

                for (const msg of messages) {
                    // Check if email already exists
                    const exists = await Email.findOne({ mailId: msg.id });
                    if (exists) {
                        continue;
                    }

                    // 2. Fetch Full Content
                    const messageQuery = {
                        query: `query { message(mailbox:"${mailbox}", id:"${msg.id}") { id html data } }`
                    };

                    const messageResponse = await axios.post(MAILDROP_API_URL, messageQuery, {
                        headers: { 'Content-Type': 'application/json' }
                    });

                    const fullMsg = messageResponse.data?.data?.message;

                    if (fullMsg) {
                        const newEmail = new Email({
                            userId: user._id,
                            userEmail: email,
                            mailId: msg.id,
                            sender: msg.headerfrom,
                            subject: msg.subject,
                            content: fullMsg.html || fullMsg.data || '',
                            receivedAt: msg.date ? new Date(msg.date) : new Date()
                        });

                        await newEmail.save();
                    }
                }

            } catch (err) {
                console.error(`Error processing user ${email}:`, err.message);
                if (err.response && err.response.data) {
                    console.error('Error details:', JSON.stringify(err.response.data));
                    throw new Error("Failed to fetch emails for user " + email);
                }
            }

            // Add a delay to avoid rate limiting (2 seconds)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log('Email fetch job completed.');

    } catch (error) {
        console.error('Error in email fetch job:', error);
    }
}

// Schedule task to run every hour
const job = cron.schedule('0 * * * *', fetchAndSaveEmails, {
    scheduled: false // Don't start immediately, let app.js start it
});

module.exports = { job, fetchAndSaveEmails };
