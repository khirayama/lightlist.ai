// テスト用セマフォクラス
export class TestSemaphore {
  private isReady = false;
  private readyPromise: Promise<void>;
  private readyResolve: (() => void) | null = null;
  
  constructor() {
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });
  }
  
  // サーバー起動完了を通知
  signal(): void {
    if (!this.isReady) {
      this.isReady = true;
      this.readyResolve?.();
    }
  }
  
  // サーバー起動完了を待機
  async wait(timeout: number = 30000): Promise<void> {
    if (this.isReady) return;
    
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Semaphore timeout')), timeout);
    });
    
    await Promise.race([this.readyPromise, timeoutPromise]);
  }
  
  // 状態をリセット
  reset(): void {
    this.isReady = false;
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });
  }
  
  // 現在の状態を取得
  isSignaled(): boolean {
    return this.isReady;
  }
}