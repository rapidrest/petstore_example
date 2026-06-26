import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            // Mirror the "@/*" path alias from tsconfig.json
            '@': root,
        },
    },
    plugins: [
        swc.vite({
            jsc: {
                parser: {
                    syntax: 'typescript',
                    decorators: true,
                },
                transform: {
                    decoratorMetadata: true,
                    legacyDecorator: true,
                },
                target: 'es2020',
            },
        }),
    ],
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.test.ts'],
        fileParallelism: false,
        hookTimeout: 30000,
        pool: 'forks',
        forks: {
            execArgv: ['--no-experimental-strip-types'],
        },
        clearMocks: true,
        coverage: {
            enabled: true,
            provider: 'v8',
            include: ['src/**/*.ts', 'app/**/*.ts'],
            exclude: ['**/node_modules/**', '**/test/**'],
            reporter: ['text', 'json', 'html', 'lcov'],
            thresholds: {
                branches: 0,
                functions: 0,
                lines: 0,
                statements: 0,
            },
            reportsDirectory: 'coverage',
        },
        reporters: ['default', 'junit'],
        outputFile: {
            junit: 'junit.xml',
        },
    },
});
