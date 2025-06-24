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
    // 安定性を優先したシーケンシャル実行設定
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // 単一フォークで順次実行
      },
    },
    
    // 並列実行完全無効化
    maxConcurrency: 1,       // 最大1テストのみ実行
    fileParallelism: false,  // ファイル並列実行禁止
    sequence: {
      hooks: 'stack',
      concurrent: false,     // 同時実行禁止
      shuffle: false,        // シャッフル禁止
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