const express = require('express');
const path = require('path');
require('@babel/register')({
    presets: ['@babel/preset-env'],
    ignore: []
});
const GuerrillaMailApi = require('guerrillamail-api').default;

const app = express();
const PORT = 5000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Generate a random email
app.get('/api/generate-email', (req, res) => {
    const api = new GuerrillaMailApi();

    api.on('emailAddress', data => {
        res.json({ success: true, email: data.email_addr });
    });

    api.on('emailAddressError', error => {
        console.error('Error generating email:', error);
        res.status(500).json({ success: false, error: 'Failed to generate email' });
    });
});

// Fetch inbox for a specific email
app.get('/api/inbox', (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const username = email.split('@')[0];
    const api = new GuerrillaMailApi({ username });

    api.on('emailAddress', () => {
        api.getEmailList({ offset: 0 }).then(list => {
            // Map the Guerrilla mail format to match our frontend expectations
            const mappedInbox = list.list.map(msg => ({
                id: msg.mail_id,
                from: msg.mail_from,
                subject: msg.mail_subject,
                timestamp: msg.mail_date
            }));

            res.json({ success: true, data: { inbox: mappedInbox } });
        }).catch(err => {
            console.error('Error fetching inbox:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch inbox' });
        });
    });
});

// Read a specific message
app.get('/api/message', (req, res) => {
    const { email, id } = req.query;
    if (!email || !id) {
        return res.status(400).json({ success: false, error: 'Email and message ID are required' });
    }

    const username = email.split('@')[0];
    const api = new GuerrillaMailApi({ username });

    api.on('emailAddress', () => {
        api.fetchEmail(Number(id)).then(message => {
            // Map guerrilla mail format to our frontend expectations
            const mappedMessage = {
                data: message.mail_body,
                from: message.mail_from,
                date: message.mail_date,
            };
            res.json({ success: true, data: mappedMessage });
        }).catch(err => {
            console.error('Error reading message:', err);
            res.status(500).json({ success: false, error: 'Failed to read message' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
