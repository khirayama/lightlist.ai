/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'], // Use full database setup for integration tests
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
    isolate: true,
    // 統合テストの部分的並列化設定（メイン設定）
    threads: false, // PostgreSQL接続の安定性のためスレッドは無効
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // 複数フォークを許可（統合テスト設定と統一）
      },
    },
    maxConcurrency: 1, // 安定性のため一旦1に戻す（データベース競合対策）
    fileParallelism: false, // ファイルレベルの並列化も無効にして安定化
    sequence: {
      hooks: 'stack',
      shuffle: false, // テスト順序の予測可能性を保持
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