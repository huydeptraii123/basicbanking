import { PrismaClient, Prisma } from '@prisma/client';

// 1. Định nghĩa kiểu cho Client có hỗ trợ Log 'query'
// Điều này giúp TS hiểu rằng client này có hàm .$on('query')
type PrismaClientWithLogs = PrismaClient<Prisma.PrismaClientOptions, 'query'>;

// Pattern: Singleton & Connection Pooling
const globalForPrisma = global as unknown as { prisma: PrismaClientWithLogs };

// 2. Khởi tạo Prisma Client với log configuration
// Chúng ta gán kiểu rõ ràng ở đây
export const prisma = globalForPrisma.prisma || (new PrismaClient({
  log: [
    { emit: 'event', level: 'query' }, // Bắt buộc dòng này để dùng .$on('query')
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
}) as PrismaClientWithLogs);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 3. Log query chậm (Type-safe, không dùng any)
// Bây giờ ta dùng Prisma.QueryEvent để có gợi ý code (duration, query, params...)
prisma.$on('query', (e: Prisma.QueryEvent) => {
  if (e.duration > 500) {
    // e.query, e.params, e.duration đều được gợi ý tự động
    console.warn(`[Slow Query] ${e.duration}ms - ${e.query}`);
  }
});

export default prisma;