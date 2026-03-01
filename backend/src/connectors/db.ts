import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
        ],
    });
};

export const db = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = db;
}

// Log slow queries in development
if (process.env.NODE_ENV === 'development') {
    db.$on('query' as never, (e: { query: string; duration: number }) => {
        if (e.duration > 100) {
            logger.warn({ duration: e.duration }, 'Slow query detected');
        }
    });
}

export async function connectDB(): Promise<void> {
    try {
        await db.$connect();
        logger.info('Database connected successfully');
    } catch (error) {
        logger.error({ error }, 'Failed to connect to database');
        throw error;
    }
}

export async function disconnectDB(): Promise<void> {
    await db.$disconnect();
    logger.info('Database disconnected');
}
