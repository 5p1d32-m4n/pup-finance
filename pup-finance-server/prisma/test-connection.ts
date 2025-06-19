import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient({
    log: ['info', 'warn', 'error']
})

async function testConnection() {
    try {
        // Check database version
        const result = await prisma.$queryRaw`SELECT version()`
        console.log('✅ PostgreSQL Version:', result)

        // Check current time
        const time = await prisma.$queryRaw`SELECT NOW()`
        console.log('⏰ Database Time:', time)

    } catch (error) {
        console.error('❌ Connection failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

testConnection()