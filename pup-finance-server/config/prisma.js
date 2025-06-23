const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

console.log('Prisma Client created.');

module.exports = prisma;