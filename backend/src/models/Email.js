const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    mailId: {
        type: String,
        required: true,
        unique: true
    },
    sender: {
        type: String,
        default: 'Unknown'
    },
    subject: {
        type: String,
        default: '(No Subject)'
    },
    content: {
        type: String,
        default: ''
    },
    receivedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'emails'
});

module.exports = mongoose.model('Email', emailSchema);
