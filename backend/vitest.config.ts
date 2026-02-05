import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules',
                'dist',
                'tests',
                '**/*.d.ts',
                'prisma',
            ],
        },
        testTimeout: 30000,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@config': resolve(__dirname, './src/config'),
            '@connectors': resolve(__dirname, './src/connectors'),
            '@middlewares': resolve(__dirname, './src/middlewares'),
            '@utils': resolve(__dirname, './src/utils'),
            '@events': resolve(__dirname, './src/events'),
            '@modules': resolve(__dirname, './src/modules'),
        },
    },
});
