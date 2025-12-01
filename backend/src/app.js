require('dotenv').config(); // <-- Move this to the very top

const express = require('express');
const { connect } = require('./config/database.js');
const { authRouter } = require('./routes/auth.js');
const emailRouter = require('./routes/email.js');
const inboxRoute = require('./routes/inbox.js');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors({ origin: "*" }))
app.use(express.json());
app.use("/", authRouter)
app.use("/", emailRouter)
app.use('/', inboxRoute)

// Connect to MongoDB database
connect().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch(err => {
    process.exit(1);
});

// Start the email fetch job
const { job } = require('./jobs/emailFetcher');
job.start();
