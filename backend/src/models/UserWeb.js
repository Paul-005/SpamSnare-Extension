const mongoose = require('mongoose');

const userWebSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    website: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true,
    collection: 'user_web'
});

// Compound index for faster queries
userWebSchema.index({ userId: 1, website: 1 }, { unique: true });

module.exports = mongoose.model('UserWeb', userWebSchema);