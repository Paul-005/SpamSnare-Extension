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

app.get('/', (req, res) => {
    res.send("Server is running");
})

// Connect to PostgreSQL database
connect().catch(err => {
    console.error("Database connection failed", err);
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;

