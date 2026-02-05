import 'dotenv/config';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './connectors/db.js';
import { logger } from './connectors/logger.js';

const PORT = env.PORT;

async function main() {
    try {
        // Connect to database
        await connectDB();
        logger.info('Database connected');

        // Start server
        const server = app.listen(PORT, () => {
            logger.info({ port: PORT, env: env.NODE_ENV }, 'Server started');
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            logger.info({ signal }, 'Shutdown signal received');

            server.close(async () => {
                logger.info('HTTP server closed');

                await disconnectDB();
                logger.info('Database connection closed');

                process.exit(0);
            });

            // Force shutdown after 30 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Unhandled rejection handler
        process.on('unhandledRejection', (reason, promise) => {
            logger.error({ reason, promise }, 'Unhandled Rejection');
        });

        // Uncaught exception handler
        process.on('uncaughtException', (error) => {
            logger.error({ error }, 'Uncaught Exception');
            shutdown('UNCAUGHT_EXCEPTION');
        });

    } catch (error) {
        logger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}

main();
