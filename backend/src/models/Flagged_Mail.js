const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FlaggedMailSchema = new Schema({
    mailId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    flaggedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'dismissed'],
        default: 'pending',
    },
    subject: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    flaggedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('FlaggedMail', FlaggedMailSchema);
