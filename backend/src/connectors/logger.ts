import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    redact: {
        paths: [
            'req.headers.authorization',
            'headers.authorization',
            'password',
            'passwordHash',
            'code',
            'otp',
            'refreshToken',
            'accessToken',
            'backupCode',
            'challengeToken',
            'ciphertext',
            'wrappedThreadKey',
        ],
        censor: '[REDACTED]',
    },
    ...(isDevelopment
        ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
        }
        : {
            formatters: {
                level: (label) => ({ level: label }),
            },
            timestamp: pino.stdTimeFunctions.isoTime,
        }),
});

export function createChildLogger(bindings: Record<string, unknown>) {
    return logger.child(bindings);
}

export type Logger = typeof logger;
