const mongoose = require('mongoose');

const flaggedSiteSchema = new mongoose.Schema({
    website_address: {
        type: String,
        required: true,
        unique: true
    },
    flags: {
        type: Number,
        required: true,
        default: 0
    },
    email: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    collection: 'flagged_site'
});

module.exports = mongoose.model('FlaggedSite', flaggedSiteSchema);