require('dotenv').config(); // <-- Move this to the very top

const express = require('express');
const { connect } = require('./config/database.js');
const authRouter = require('./routes/email.js');
const inboxRoute = require('./routes/inbox.js');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/", authRouter)
app.use('/', inboxRoute);



// Connect to SAP HANA database
connect().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Failed to connect to SAP HANA database:", err);
});
