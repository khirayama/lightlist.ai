// APIサーバー情報を取得するヘルパー（グローバルセットアップで設定された情報を使用）
export async function getApiServerInfo() {
  // APIサーバーの初期化を待機（最大10秒）
  const maxWaitTime = 10000;
  const checkInterval = 100;
  let waitedTime = 0;
  
  while (waitedTime < maxWaitTime) {
    // まずグローバル変数から取得を試行
    const apiServerInfo = (globalThis as any).__API_SERVER_INFO__;
    if (apiServerInfo) {
      return apiServerInfo;
    }
    
    // グローバル変数が利用できない場合、ファイルから読み込みを試行
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, '../api-server-config.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        const parsedInfo = JSON.parse(configData);
        return parsedInfo;
      }
    } catch (error) {
      // ファイル読み込みに失敗した場合は続行
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waitedTime += checkInterval;
  }
  
  throw new Error('API server info not found. Make sure global setup is properly configured.');
}

// テスト用ユーザーデータ生成（各テストで独立したユーザーを作成）
export function generateTestUser(suffix = '') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    email: `test${suffix}${timestamp}${random}@example.com`,
    password: 'testpassword123',
    deviceId: `test-device-${timestamp}${suffix}${random}`
  };
}

// APIリクエストヘルパー
export async function apiRequest(
  endpoint: string, 
  options: RequestInit = {}, 
  token?: string
): Promise<Response> {
  const apiServerInfo = await getApiServerInfo();
  const url = `${apiServerInfo.apiBaseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}

// ヘルスチェック専用リクエストヘルパー（APIプレフィックスなし）
export async function healthCheckRequest(): Promise<Response> {
  const apiServerInfo = await getApiServerInfo();
  const url = `${apiServerInfo.baseUrl}/health`;
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// テスト用のストレージ実装
export class TestStorage {
  private storage = new Map<string, string>();

  getItem(key: string): string | null {
    const value = this.storage.get(key) || null;
    console.log(`TestStorage - getItem(${key}):`, value);
    return value;
  }

  setItem(key: string, value: string): void {
    console.log(`TestStorage - setItem(${key}):`, value);
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    console.log(`TestStorage - removeItem(${key})`);
    this.storage.delete(key);
  }

  clear(): void {
    console.log('TestStorage - clear()');
    this.storage.clear();
  }
}

// 統合テスト設定
export const INTEGRATION_CONFIG = {
  API_TIMEOUT: 10000,
  SETUP_TIMEOUT: 30000,
  TEST_TIMEOUT: 15000
} as const;

