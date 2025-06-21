/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import os from 'os';

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
    // ユニットテストの並列化最適化設定
    threads: true, // スレッドプールを有効化
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: Math.max(1, Math.min(os.cpus().length, 4)), // CPU数に応じた最適化（最大4スレッド）
        minThreads: 1,
      },
    },
    maxConcurrency: Math.max(2, Math.min(os.cpus().length * 2, 8)), // 並列実行数の最適化
    isolate: true, // テスト間の分離を保証
    fileParallelism: true, // ファイルレベルの並列化を有効
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