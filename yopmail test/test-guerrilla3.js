require('@babel/register')({ presets: ['@babel/preset-env'], ignore: [] });
const Guerrilla = require('guerrillamail-api').default;
const api = new Guerrilla();
api.on('emailAddress', data => {
    api.getEmailList({ offset: 0 }).then(list => {
        if (list.list && list.list.length > 0) {
            const firstId = list.list[0].mail_id;
            return api.fetchEmail(firstId);
        } else {
            console.log("No emails found.");
        }
    }).then(msg => {
        if (msg) console.log(msg);
    }).catch(console.error);
});
