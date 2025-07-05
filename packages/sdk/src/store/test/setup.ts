import { beforeEach, afterEach } from 'vitest';
import { createStore } from '../implementation';
import { StoreConfig } from '../index';

// テスト用のストア初期化設定
export const defaultTestConfig: StoreConfig = {
  enableDevTools: false,
  enablePersistence: false,
  syncInterval: 1000,
  maxRetries: 3
};

// テスト用のストアファクトリー
export function createTestStore(config: Partial<StoreConfig> = {}) {
  return createStore({ ...defaultTestConfig, ...config });
}

// テストごとのクリーンアップ
beforeEach(() => {
  // 各テストの前に実行される共通処理
});

afterEach(() => {
  // 各テストの後に実行される共通処理
});