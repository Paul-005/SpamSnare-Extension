const easyYopmail = require('easy-yopmail');
(async () => {
    const email = await easyYopmail.getMail();
    console.log("Email:", email);
    const inbox = await easyYopmail.getInbox(email.split('@')[0]);
    console.log("Inbox:", JSON.stringify(inbox, null, 2));
})();
