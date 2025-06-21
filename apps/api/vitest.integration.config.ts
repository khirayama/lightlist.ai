/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import os from 'os';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    isolate: true,
    // 統合テストの並列化設定（中級レベル）
    threads: false, // PostgreSQL接続の安定性のためスレッドは無効のまま
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // 複数フォークを許可
      },
    },
    maxConcurrency: 1, // 安定性を最優先（並列化は一旦無効）
    fileParallelism: false, // ファイルレベルの並列化も無効化
    sequence: {
      hooks: 'stack',
      shuffle: false, // テスト順序の予測可能性を保持
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