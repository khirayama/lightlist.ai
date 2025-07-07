// 統合テスト用の共有状態管理
interface ApiServerState {
  isReady: boolean;
  config: {
    port: number;
    baseUrl: string;
    apiBaseUrl: string;
  } | null;
  readyPromise: Promise<void> | null;
  readyResolve: (() => void) | null;
  startTime: number | null;
}

class SharedStateManager {
  private state: ApiServerState = {
    isReady: false,
    config: null,
    readyPromise: null,
    readyResolve: null,
    startTime: null
  };
  
  // 状態を初期化
  initialize(): void {
    console.log('SharedStateManager - Initializing state...');
    this.state.isReady = false;
    this.state.config = null;
    this.state.startTime = Date.now();
    
    this.state.readyPromise = new Promise<void>((resolve) => {
      this.state.readyResolve = resolve;
    });
    
    console.log('SharedStateManager - State initialized');
  }
  
  // サーバー起動完了を設定
  setReady(config: any): void {
    console.log('SharedStateManager - Setting server ready with config:', config);
    
    this.state.isReady = true;
    this.state.config = config;
    
    if (this.state.readyResolve) {
      this.state.readyResolve();
      console.log('SharedStateManager - Ready promise resolved');
    }
  }
  
  // サーバー起動完了を待機
  async waitForReady(timeout: number = 30000): Promise<any> {
    console.log(`SharedStateManager - Waiting for ready (timeout: ${timeout}ms)...`);
    
    if (this.state.isReady && this.state.config) {
      console.log('SharedStateManager - Already ready, returning config immediately');
      return this.state.config;
    }
    
    if (!this.state.readyPromise) {
      throw new Error('SharedStateManager not initialized');
    }
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const waitTime = this.state.startTime ? Date.now() - this.state.startTime : 'unknown';
        reject(new Error(`Timeout waiting for server ready after ${waitTime}ms`));
      }, timeout);
    });
    
    try {
      await Promise.race([this.state.readyPromise, timeoutPromise]);
      console.log('SharedStateManager - Ready signal received');
      return this.state.config;
    } catch (error) {
      console.error('SharedStateManager - Wait failed:', error);
      throw error;
    }
  }
  
  // 現在の状態を取得
  getState(): ApiServerState {
    return { ...this.state };
  }
  
  // 状態をリセット
  reset(): void {
    console.log('SharedStateManager - Resetting state...');
    this.state = {
      isReady: false,
      config: null,
      readyPromise: null,
      readyResolve: null,
      startTime: null
    };
  }
  
  // デバッグ情報を出力
  debug(): void {
    const state = this.getState();
    console.log('SharedStateManager - Debug info:', {
      isReady: state.isReady,
      hasConfig: !!state.config,
      hasPromise: !!state.readyPromise,
      hasResolve: !!state.readyResolve,
      startTime: state.startTime,
      currentTime: Date.now(),
      elapsed: state.startTime ? Date.now() - state.startTime : null
    });
  }
}

// シングルトンインスタンス
export const sharedStateManager = new SharedStateManager();

// グローバル変数として設定（フォールバック用）
(globalThis as any).__SHARED_STATE_MANAGER__ = sharedStateManager;