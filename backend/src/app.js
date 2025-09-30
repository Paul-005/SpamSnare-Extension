require('dotenv').config(); // <-- Move this to the very top

const express = require('express');
const { connect } = require('./config/database.js');
const { authRouter } = require('./routes/auth.js');
const emailRouter = require('./routes/email.js');
const inboxRoute = require('./routes/inbox.js');
const { migrationRouter } = require('./routes/migration.js');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors({ origin: "*" }))
app.use(express.json());
app.use("/", authRouter)
app.use("/", emailRouter)
app.use('/', inboxRoute)
app.use('/', migrationRouter);

// Connect to MongoDB database
connect().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Failed to connect to MongoDB database:", err);
    process.exit(1);
});
