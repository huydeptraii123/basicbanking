import { PrismaClient, Prisma } from '@prisma/client';

type PrismaClientWithLogs = PrismaClient<Prisma.PrismaClientOptions, 'query'>;

// Pattern: Singleton & Connection Pooling
const globalForPrisma = global as unknown as { prisma: PrismaClientWithLogs };

export const prisma = globalForPrisma.prisma || (new PrismaClient({
  log: [
    { emit: 'event', level: 'query' }, 
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
}) as PrismaClientWithLogs);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;


prisma.$on('query', (e: Prisma.QueryEvent) => {
  if (e.duration > 500) {
    console.warn(`[Slow Query] ${e.duration}ms - ${e.query}`);
  }
});

export default prisma;