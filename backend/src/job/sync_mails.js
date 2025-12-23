const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { connect, mongoose } = require('../config/database');
const User = require('../models/User');
const UserWeb = require('../models/UserWeb');
const FlaggedSite = require('../models/FlaggedSite');

const cron = require('node-cron');


const syncMails = async () => {
    try {
        console.log('Starting email sync...');

        // Connect to Database
        await connect();

        // Fetch all users

        for (const user of users) {
            console.log(`\nProcessing user: ${user.email} (ID: ${user._id})`);

            // Find all UserWeb entries for this user
            const userWebs = await UserWeb.find({ userId: user._id });

            for (const userWeb of userWebs) {
                const email = userWeb.email.split('@')[0];

                // Maildrop GraphQL Query
                const url = 'https://api.maildrop.cc/graphql';
                const query = `
                    query {
                        inbox(mailbox: "${email}") {
                            id
                        }
                    }
                `;

                try {
                    const response = await axios.post(url, { query }, {
                        headers: { 'Content-Type': 'application/json' }
                    });

                    const inbox = response.data?.data?.inbox || [];

                    if (inbox.length > 0) {
                        for (const mail of inbox) {
                            const data = {
                                query: `query Example { message(mailbox:"${email}", id:"${mail.id}") { id subject headerfrom } }`
                            };

                            try {
                                const response = await axios.post(url, data, {
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                });

                                const message = response.data?.data?.message || [];

                                let flag = 0;
                                const websiteLower = userWeb.website.toLowerCase().split('.');
                                let keyword = '';
                                if (websiteLower.length > 1) {
                                    keyword = websiteLower[websiteLower.length - 2];
                                } else {
                                    keyword = websiteLower;
                                }
                                if (
                                    typeof message.headerfrom === 'string' &&
                                    !message.headerfrom.toLowerCase().includes(keyword)
                                ) {
                                    flag = 1;
                                }

                                if (flag > 0) {

                                    try {
                                        const existingFlaggedSite = await FlaggedSite.findOne({ website_address: userWeb.website });
                                        if (!existingFlaggedSite) {
                                            // If site is not flagged, create a new entry
                                            const newFlaggedSite = new FlaggedSite({
                                                website_address: userWeb.website,
                                                flags: flag,
                                                email: email
                                            });
                                            await newFlaggedSite.save();
                                        } else {
                                            // If site is already flagged, increment the flag count
                                            await FlaggedSite.updateOne({ website_address: userWeb.website }, { $inc: { flags: 1 } });
                                        }
                                    } catch (dbErr) {
                                        console.error('Database error:', dbErr.message);
                                    }
                                }

                            } catch (error) {
                                console.error('Error fetching specific email from Maildrop.cc:', error.message);

                            }
                        }
                    }

                } catch (error) {
                    console.error(`Error fetching emails for ${email}:`, error.message);
                    if (error.response) {
                        console.error('Response data:', error.response.data);
                    }
                }
            }
        }

        // Fetch and log mails for Flagged Sites
        console.log('\nFetching mails for Flagged Sites...');
        const flaggedSites = await FlaggedSite.find({});

        for (const site of flaggedSites) {
            const email = site.email;
            console.log(`Checking mails for flagged site email: ${email}`);

            // Maildrop GraphQL Query
            const url = 'https://api.maildrop.cc/graphql';
            const query = `
                query {
                    inbox(mailbox: "${email}") {
                        id
                    }
                }
            `;

            try {
                const response = await axios.post(url, { query }, {
                    headers: { 'Content-Type': 'application/json' }
                });

                const inbox = response.data?.data?.inbox || [];

                if (inbox.length > 0) {
                    for (const mail of inbox) {
                        const data = {
                            query: `query Example { message(mailbox:"${email}", id:"${mail.id}") { id subject headerfrom } }`
                        };

                        try {
                            const msgResponse = await axios.post(url, data, {
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            const message = msgResponse.data?.data?.message;
                            if (message) {
                                console.log(`Mail for ${email}:`, message);
                            }

                        } catch (error) {
                            console.error(`Error fetching specific email for flagged site ${email}:`, error.message);
                        }
                    }
                } else {
                    console.log(`No mails found for ${email}`);
                }

            } catch (error) {
                console.error(`Error fetching inbox for flagged site ${email}:`, error.message);
            }
        }

        console.log('\nSync completed.');
        await mongoose.disconnect();

    } catch (error) {
        console.error('Error in syncMails:', error);
        process.exit(1);
    }
};



// Run the function
syncMails();
