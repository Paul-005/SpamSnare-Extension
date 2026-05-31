const mongoose = require('mongoose');

const genEmailSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'gen_emails'
});

module.exports = mongoose.model('GenEmail', genEmailSchema);
