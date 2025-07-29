const { Account } = require('node-appwrite');
const client = require('../config/appwrite');
const { conn } = require('../config/database');

const authRouter = require('express').Router();

const account = new Account(client);


authRouter.post('/signup', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const user = await account.create('unique()', email, password, name);

        conn.prepare('INSERT INTO Users (ID, NAME, EMAIL) VALUES (?, ?, ?)', (err, statement) => {
            if (err) {
                console.error('Error preparing insert:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            statement.exec([user.$id, user.name, user.email], (err) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    return res.status(500).json({ success: false, error: 'Database error' });
                }
                statement.drop();
            });
        });

        res.status(201).json({ success: true, user });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const session = await account.createEmailSession(email, password);
        res.status(200).json({ success: true, session });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});


module.exports = authRouter;
