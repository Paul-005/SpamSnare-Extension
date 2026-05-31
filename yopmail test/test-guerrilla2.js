require('@babel/register')({ presets: ['@babel/preset-env'], ignore: [] });
const Guerrilla = require('guerrillamail-api').default;
const api = new Guerrilla({ username: 'ukwmrhgm' });
api.on('emailAddress', data => {
    console.log("Registered:", data.email_addr);
    api.getEmailList({ offset: 0 }).then(list => {
        console.log("Inbox List length:", list.list.length);
    });
});
