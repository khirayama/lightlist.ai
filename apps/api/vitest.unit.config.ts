/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup-unit.ts'],
    testTimeout: 10000,
    include: [
      'src/__tests__/utils/**/*.test.ts',
    ],
    exclude: [
      'src/__tests__/routes/**/*.test.ts',
      'src/__tests__/scenarios/**/*.test.ts',
      'src/__tests__/middleware/**/*.test.ts',
    ],
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        'prisma/',
      ],
      lines: 90,
      functions: 90,
      branches: 80,
      statements: 90,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});