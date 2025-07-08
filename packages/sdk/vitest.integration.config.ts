import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // 統合テストのみを実行（単体テストを除外）
    include: [
      'src/__tests__/integration/**/*.test.ts'
    ],
    // グローバルセットアップ・ティアダウンの設定
    globalSetup: ['./src/__tests__/global-setup.ts'],
    // 並列実行を有効化
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    // 並列実行を有効化（APIサーバーを共有、データは独立）
    maxConcurrency: 2, // 3から2に削減して競合を減らす
    fileParallelism: true,
    // 並列実行を有効化
    sequence: {
      concurrent: true,
      shuffle: false,
      hooks: 'stack',
    },
    // 並列実行に最適化されたタイムアウト
    testTimeout: 20000, // 30秒から20秒に短縮
    hookTimeout: 30000, // 60秒から30秒に短縮
    // テスト間の分離を強化
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/examples/'
      ]
    }
  }
});