import { sharedStateManager } from '../utils/shared-state';

// APIサーバー情報を取得するヘルパー（グローバルセットアップで設定された情報を使用）
export async function getApiServerInfo() {
  // グローバル変数から共有状態管理を取得
  const globalSharedState = (globalThis as any).__SHARED_STATE_MANAGER__;
  
  if (globalSharedState) {
    try {
      console.log('Trying global shared state manager...');
      globalSharedState.debug();
      
      const config = await globalSharedState.waitForReady(30000);
      if (config) {
        console.log('API server info retrieved from global shared state manager');
        return config;
      }
    } catch (error) {
      console.warn('Global shared state manager failed:', error.message);
    }
  } else {
    console.warn('No global shared state manager found');
  }
  
  // ローカル共有状態管理による待機をフォールバックとして試行
  try {
    console.log('Trying local shared state manager...');
    sharedStateManager.debug();
    
    const config = await sharedStateManager.waitForReady(30000);
    if (config) {
      console.log('API server info retrieved from local shared state manager');
      return config;
    }
  } catch (error) {
    console.warn('Local shared state manager failed:', error.message);
  }
  
  // セマフォ機能をフォールバックとして利用
  const semaphore = (globalThis as any).__SERVER_READY_SEMAPHORE__;
  console.log('Checking semaphore availability:', !!semaphore);
  
  if (semaphore) {
    try {
      console.log('Semaphore found, checking if already signaled:', semaphore.isSignaled());
      console.log('Waiting for API server to be ready via semaphore...');
      await semaphore.wait(30000); // 30秒まで待機
      console.log('API server ready signal received');
    } catch (error) {
      console.warn('Semaphore wait failed, falling back to polling:', error);
    }
  } else {
    console.warn('No semaphore found, using polling method only');
  }
  
  // APIサーバーの初期化を待機（最大10秒）
  const maxWaitTime = 10000;
  const checkInterval = 100;
  let waitedTime = 0;
  
  while (waitedTime < maxWaitTime) {
    // まずグローバル変数から取得を試行
    const apiServerInfo = (globalThis as any).__API_SERVER_INFO__;
    if (apiServerInfo) {
      console.log('API server info retrieved from global variable');
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
        console.log('API server info retrieved from config file');
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

// APIサーバー情報を指数バックオフリトライで取得
export async function getApiServerInfoWithRetry(maxRetries: number = 5): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Getting API server info (attempt ${attempt + 1}/${maxRetries + 1})`);
      const info = await getApiServerInfo();
      
      // 情報の有効性を検証
      if (info && info.apiBaseUrl && info.port) {
        console.log(`API server info validation: port=${info.port}, apiBaseUrl=${info.apiBaseUrl}`);
        
        // 接続テスト
        try {
          console.log(`Testing connection to: ${info.baseUrl}/health`);
          const testResponse = await fetch(`${info.baseUrl}/health`, {
            signal: AbortSignal.timeout(5000)
          });
          console.log(`Connection test response:`, {
            response: testResponse,
            ok: testResponse?.ok,
            status: testResponse?.status,
            statusText: testResponse?.statusText
          });
          
          if (testResponse && testResponse.ok) {
            console.log(`API server connection test passed on attempt ${attempt + 1}`);
            return info;
          } else {
            console.log(`API server connection test failed: response=${!!testResponse}, ok=${testResponse?.ok}, status=${testResponse?.status}`);
          }
        } catch (connectionError) {
          console.log(`API server connection test error:`, connectionError.message);
          console.log(`Error details:`, connectionError);
        }
      } else {
        console.log(`Invalid API server info:`, info);
      }
    } catch (error) {
      console.log(`getApiServerInfo failed on attempt ${attempt + 1}:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to get API server info after ${maxRetries + 1} attempts: ${error.message}`);
      }
      
      // 指数バックオフ（最大8秒まで）
      const delay = Math.min(Math.pow(2, attempt) * 1000, 8000);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed to get API server info after ${maxRetries + 1} attempts`);
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

