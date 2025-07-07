import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    // グローバルセットアップ・ティアダウンの設定
    globalSetup: ['./src/__tests__/global-setup.ts'],
    // 完全にシーケンシャルな実行（並行実行を完全に無効化）
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // 統合テストのタイムアウトを大幅に延長
    testTimeout: 60000,
    hookTimeout: 120000,
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
