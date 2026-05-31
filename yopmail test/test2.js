const easyYopmail = require('easy-yopmail');
(async () => {
    const inbox = await easyYopmail.getInbox('testing_01');
    console.log("Inbox:", JSON.stringify(inbox, null, 2));
})();
