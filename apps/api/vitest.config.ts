/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // 合理的なタイムアウト設定
    testTimeout: 60000,      // 1分 - テストタイムアウト
    hookTimeout: 30000,      // 30秒 - フックタイムアウト
    teardownTimeout: 30000,  // 30秒 - ティアダウンタイムアウト
    
    // シンプルなシリアル実行設定
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