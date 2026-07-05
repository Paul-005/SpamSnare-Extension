const axios = require('axios');
const path = require('path');
const { connect, prisma } = require('../config/database');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const syncMails = async () => {
    try {
        console.log('Starting email sync...');

        // Connect to Database
        await connect();

        // Fetch all users
        const users = await prisma.user.findMany();

        for (const user of users) {
            console.log(`\nProcessing user: ${user.email} (ID: ${user.id})`);

            // Find all UserWeb entries for this user
            const userWebs = await prisma.userWeb.findMany({
                where: { userId: user.id }
            });

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

                                const message = response.data?.data?.message || {};

                                let flag = 0;
                                const websiteLower = userWeb.website.toLowerCase().split('.');
                                let keyword = '';
                                if (websiteLower.length > 1) {
                                    keyword = websiteLower[websiteLower.length - 2];
                                } else {
                                    keyword = websiteLower[0];
                                }
                                if (
                                    typeof message.headerfrom === 'string' &&
                                    !message.headerfrom.toLowerCase().includes(keyword)
                                ) {
                                    flag = 1;
                                }

                                if (flag > 0) {
                                    try {
                                        const existingFlaggedSite = await prisma.flaggedSite.findUnique({
                                            where: { websiteAddress: userWeb.website }
                                        });
                                        if (!existingFlaggedSite) {
                                            // If site is not flagged, create a new entry
                                            await prisma.flaggedSite.create({
                                                data: {
                                                    websiteAddress: userWeb.website,
                                                    flags: flag,
                                                    email: email
                                                }
                                            });
                                        } else {
                                            // If site is already flagged, increment the flag count
                                            await prisma.flaggedSite.update({
                                                where: { websiteAddress: userWeb.website },
                                                data: { flags: { increment: 1 } }
                                            });
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
        const flaggedSites = await prisma.flaggedSite.findMany();

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
        await prisma.$disconnect();

    } catch (error) {
        console.error('Error in syncMails:', error);
        process.exit(1);
    }
};

// Run the function
syncMails();
