// 統合テスト用の軽量同期クラス
interface ApiServerConfig {
  port: number;
  baseUrl: string;
  apiBaseUrl: string;
}

export class TestSyncManager {
  private isReady = false;
  private config: ApiServerConfig | null = null;
  private readyPromise: Promise<void>;
  private readyResolve: (() => void) | null = null;

  constructor() {
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });
  }

  // サーバー起動完了を設定
  setReady(config: ApiServerConfig): void {
    this.isReady = true;
    this.config = config;
    
    if (this.readyResolve) {
      this.readyResolve();
    }
  }

  // サーバー起動完了を待機
  async waitForReady(timeout: number = 20000): Promise<ApiServerConfig> {
    if (this.isReady && this.config) {
      return this.config;
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Server ready timeout after ${timeout}ms`));
      }, timeout);
    });

    await Promise.race([this.readyPromise, timeoutPromise]);
    
    if (!this.config) {
      throw new Error('Server config not available');
    }
    
    return this.config;
  }

  // 現在の状態を取得
  isServerReady(): boolean {
    return this.isReady;
  }

  // 設定を取得
  getConfig(): ApiServerConfig | null {
    return this.config;
  }

  // 状態をリセット
  reset(): void {
    this.isReady = false;
    this.config = null;
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });
  }
}

// シングルトンインスタンス
export const testSyncManager = new TestSyncManager();

// グローバル変数として設定
(globalThis as any).__TEST_SYNC_MANAGER__ = testSyncManager;