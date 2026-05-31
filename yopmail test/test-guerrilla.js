require('@babel/register')({
    presets: ['@babel/preset-env'],
    ignore: []
});
const Guerrilla = require('guerrillamail-api').default;
const api = new Guerrilla();
api.getEmailAddress().then(res => {
    console.log("Email:", res);
    return api.getEmailList({ offset: 0 });
}).then(list => {
    console.log("Inbox:", list);
}).catch(err => console.error(err));
