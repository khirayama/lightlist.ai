import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // 単体テストのみを実行（統合テストを除外）
    exclude: [
      'node_modules',
      'dist',
      'src/__tests__/integration/**',
      'src/__tests__/global-setup.ts',
      'src/__tests__/global-teardown.ts'
    ],
    // 並列実行を有効化（単体テストは独立して実行可能）
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 2,
        maxThreads: 8,
      },
    },
    // 並列実行のためのオプション
    maxConcurrency: 8,
    fileParallelism: true,
    // 単体テストの高速実行
    testTimeout: 8000,
    hookTimeout: 8000,
    // テスト間の分離を適度に設定
    isolate: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/examples/',
        'src/__tests__/integration/**',
        'src/__tests__/global-setup.ts',
        'src/__tests__/global-teardown.ts'
      ]
    }
  }
});
