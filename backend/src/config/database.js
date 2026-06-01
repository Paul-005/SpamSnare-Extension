const mongoose = require('mongoose');
const dns = require('dns');

const connect = async () => {
    try {
        // Set public DNS only on Windows to resolve mongodb+srv SRV records properly
        if (process.platform === 'win32') {
            dns.setServers(['8.8.8.8', '8.8.4.4']);
        }

        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);

        console.log('Connected to MongoDB successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
    process.exit(1);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
    process.exit(1);
});

module.exports = {
    connect,
    mongoose
};

