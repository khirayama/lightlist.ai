import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    // 統合テストの並行実行を制御（ポート競合を回避）
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // 統合テストのタイムアウトを延長
    testTimeout: 30000,
    hookTimeout: 60000,
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
