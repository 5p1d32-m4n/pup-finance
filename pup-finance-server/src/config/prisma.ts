import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

console.log('Prisma Client created');

// Add TypeScript middleware example
prisma.$use(async (params: any, next: any) => {
  // Example: Log query duration
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
  return result;
});

export default prisma;