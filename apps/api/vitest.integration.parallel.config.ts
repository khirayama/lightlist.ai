/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import os from 'os';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup-parallel.ts'],
    testTimeout: 45000,
    hookTimeout: 45000,
    teardownTimeout: 45000,
    isolate: true,
    // 並列化された統合テスト設定
    threads: false, // PostgreSQL接続の安定性のためスレッドは無効
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // 複数フォークを許可
        maxForks: Math.min(4, os.cpus().length), // CPU数に応じたフォーク数制限
      },
    },
    maxConcurrency: Math.min(4, os.cpus().length), // スキーマ分離により並列実行可能
    fileParallelism: true, // ファイルレベルの並列化を有効
    sequence: {
      hooks: 'stack',
      shuffle: false,
    },
    include: [
      'src/__tests__/routes/**/*.test.ts',
      'src/__tests__/scenarios/**/*.test.ts',
      'src/__tests__/middleware/**/*.test.ts',
    ],
    exclude: [
      'src/__tests__/utils/**/*.test.ts',
    ],
    env: {
      NODE_ENV: 'test',
      TEST_PARALLEL_MODE: 'true', // 並列モードフラグ
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