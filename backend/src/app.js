require('dotenv').config(); // <-- Move this to the very top

const express = require('express');
const { connect } = require('./config/database.js');
const authRouter = require('./routes/email.js');
const inboxRoute = require('./routes/inbox.js');
const { create } = require('express-handlebars');
const cors = require('cors');
const app = express();
const PORT = 3000;

const hbs = create({ /* config */ });

// Register `hbs.engine` with the Express app.
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(cors({ origin: "*" }))
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
