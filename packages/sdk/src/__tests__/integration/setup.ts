import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { setTimeout } from 'timers/promises';

let apiServer: ChildProcess | null = null;
const API_PORT = 3002; // 3001の代わりに3002を使用
const API_BASE_URL = `http://localhost:${API_PORT}`;

// APIサーバーの起動ヘルパー
export async function startApiServer(): Promise<void> {
  if (apiServer) {
    console.log('API server already running');
    return;
  }

  // 既存のプロセスをチェックして停止
  try {
    const { execSync } = require('child_process');
    execSync(`lsof -ti:${API_PORT} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    await setTimeout(1000); // 停止処理を待機
  } catch (error) {
    // プロセス停止エラーは無視
  }

  console.log('Starting API server for integration tests...');
  
  // API サーバーのディレクトリパス
  const apiPath = join(__dirname, '../../../../../apps/api');
  
  // APIサーバーを起動（テスト用データベースを使用）
  apiServer = spawn('npm', ['run', 'dev'], {
    cwd: apiPath,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: API_PORT.toString(),
      DATABASE_URL: 'postgresql://lightlist_user:lightlist_password@localhost:5435/lightlist_test_db?schema=public'
    },
    stdio: 'pipe' // ログを制御するため
  });

  let serverReady = false;
  
  // サーバーの出力を監視
  if (apiServer.stdout) {
    apiServer.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running on port')) {
        serverReady = true;
      }
      // デバッグモード時のみログ出力
      if (process.env.DEBUG_INTEGRATION) {
        console.log(`API Server: ${output}`);
      }
    });
  }

  if (apiServer.stderr) {
    apiServer.stderr.on('data', (data) => {
      const output = data.toString();
      // エラーは常に表示
      console.error(`API Server Error: ${output}`);
    });
  }

  // サーバーの起動を待機（最大30秒）
  const maxWaitTime = 30000;
  const checkInterval = 500;
  let waitedTime = 0;
  
  while (!serverReady && waitedTime < maxWaitTime) {
    await setTimeout(checkInterval);
    waitedTime += checkInterval;
    
    // ヘルスチェックも試行
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        serverReady = true;
        break;
      }
    } catch (error) {
      // まだサーバーが起動していない
    }
  }

  if (!serverReady) {
    throw new Error('API server failed to start within 30 seconds');
  }

  console.log('API server started successfully');
}

// APIサーバーの停止ヘルパー
export async function stopApiServer(): Promise<void> {
  if (!apiServer) {
    return;
  }

  console.log('Stopping API server...');
  
  // Graceful shutdown を試行
  apiServer.kill('SIGTERM');
  
  // 5秒待ってもプロセスが終了しない場合は強制終了
  await setTimeout(5000);
  
  if (!apiServer.killed) {
    console.log('Forcing API server shutdown...');
    apiServer.kill('SIGKILL');
  }
  
  apiServer = null;
  console.log('API server stopped');
}

// テスト用データベースのクリーンアップ
export async function cleanTestDatabase(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/test/cleanup`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      // /test/cleanup エンドポイントが存在しない場合のフォールバック
      // 直接データベースクリーンアップを実行
      console.warn('Test cleanup endpoint not available, skipping database cleanup');
    }
  } catch (error) {
    console.warn('Failed to clean test database:', error);
  }
}

// テスト用ユーザーデータ生成
export function generateTestUser(suffix = '') {
  const timestamp = Date.now();
  return {
    email: `test${suffix}${timestamp}@example.com`,
    password: 'testpassword123',
    deviceId: `test-device-${timestamp}${suffix}`
  };
}

// APIリクエストヘルパー
export async function apiRequest(
  endpoint: string, 
  options: RequestInit = {}, 
  token?: string
): Promise<Response> {
  const url = `${API_BASE_URL}/api${endpoint}`;
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

// 統合テスト設定
export const INTEGRATION_CONFIG = {
  API_BASE_URL: `${API_BASE_URL}/api`, // APIプレフィックスを追加
  API_TIMEOUT: 10000,
  SETUP_TIMEOUT: 30000,
  TEST_TIMEOUT: 15000
} as const;

// テスト用のストレージ実装
export class TestStorage {
  private storage = new Map<string, string>();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

// テスト用SDK初期化ヘルパー
export function createTestSDK(config: { apiUrl: string; apiTimeout?: number }) {
  // 動的インポートを使用してモジュールを読み込み
  const { StoreImpl } = require('../../store/implementation');
  const { AuthServiceImpl } = require('../../services/auth.service');
  const { SettingsServiceImpl } = require('../../services/settings.service');
  const { CollaborativeServiceImpl } = require('../../services/collaborative.service');
  const { ShareServiceImpl } = require('../../services/share.service');
  const { ActionsImpl } = require('../../actions/actions');
  const { HttpClientImpl } = require('../../services/base/http-client');

  const store = new StoreImpl({});
  const storage = new TestStorage();

  // AuthServiceを先に作成
  let authService: any;
  let isRefreshing = false;
  
  // HttpClientを設定
  const httpClient = new HttpClientImpl({
    baseUrl: config.apiUrl,
    timeout: config.apiTimeout || 10000,
    retries: 3,
    getAuthToken: async () => {
      if (authService) {
        return authService.getAccessToken();
      }
      return null;
    },
    onUnauthorized: async () => {
      if (authService && !isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = authService.getRefreshToken();
          if (refreshToken) {
            await authService.refresh(refreshToken);
          }
        } catch (error) {
          await authService.logout();
          throw error;
        } finally {
          isRefreshing = false;
        }
      }
    }
  });

  // AuthServiceを初期化
  authService = new AuthServiceImpl(httpClient, storage);
  
  const settingsService = new SettingsServiceImpl(httpClient);
  const collaborativeService = new CollaborativeServiceImpl(httpClient);
  const shareService = new ShareServiceImpl(httpClient);

  const actions = new ActionsImpl(
    authService,
    settingsService,
    collaborativeService,
    shareService,
    store
  );

  return {
    actions,
    store,
    httpClient,
    authService,
    testStorage: storage
  };
}

export { API_BASE_URL };