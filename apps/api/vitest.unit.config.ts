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
    // 安定性を優先したシーケンシャル実行設定
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,    // 単一スレッドで順次実行
      },
    },
    
    // 並列実行完全無効化
    maxConcurrency: 1,       // 最大1テストのみ実行
    fileParallelism: false,  // ファイル並列実行禁止
    
    // テスト実行順序の制御
    sequence: {
      concurrent: false,     // 同時実行禁止
      shuffle: false,        // シャッフル禁止
    },
    
    isolate: true, // テスト間の分離を保証
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