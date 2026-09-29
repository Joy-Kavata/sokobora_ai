const { PrismaClient } = require('@prisma/client');

const prisma = globalThis.prismaClient || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaClient = prisma;
}

module.exports = prisma;