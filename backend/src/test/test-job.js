require('dotenv').config();
const { connect } = require('../config/database');
const { fetchAndSaveEmails } = require('../jobs/emailFetcher');
const mongoose = require('mongoose');

async function runTest() {
    try {
        console.log('Connecting to database...');
        await connect();
        console.log('Connected.');

        console.log('Running fetchAndSaveEmails...');
        await fetchAndSaveEmails();
        console.log('Done.');

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

runTest();
