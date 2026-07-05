const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const connect = async () => {
    try {
        await prisma.$connect();
        console.log('Connected to PostgreSQL successfully');
        return prisma;
    } catch (error) {
        console.error('PostgreSQL connection error:', error);
        throw error;
    }
};

module.exports = {
    connect,
    prisma
};
