import crypto from 'crypto';
import { testSyncManager } from '../utils/test-sync';
import { createSDK } from '../../index';
import { vi } from 'vitest';

// APIサーバー情報を取得するヘルパー（グローバルセットアップで設定された情報を使用）
export async function getApiServerInfo() {
  // 並列実行時の対策として、3つのフォールバックを使用
  const DEFAULT_CONFIG = {
    port: 3002,
    baseUrl: 'http://localhost:3002',
    apiBaseUrl: 'http://localhost:3002/api'
  };
  
  // 1. グローバル変数から直接取得を試行
  const apiServerInfo = (globalThis as any).__API_SERVER_INFO__;
  if (apiServerInfo) {
    console.log('API server info retrieved from global variable');
    // 接続確認
    if (await testConnection(apiServerInfo)) {
      return apiServerInfo;
    }
  }
  
  // 2. 統合クラスによる待機
  const globalTestSync = (globalThis as any).__TEST_SYNC_MANAGER__;
  if (globalTestSync) {
    try {
      console.log('Trying global test sync manager...');
      const config = await globalTestSync.waitForReady(3000); // 短時間で試行
      if (config && await testConnection(config)) {
        console.log('API server info retrieved from global test sync manager');
        return config;
      }
    } catch (error) {
      console.warn('Global test sync manager failed:', error instanceof Error ? error.message : String(error));
    }
  }
  
  // 3. デフォルト設定で接続確認
  console.log('Trying default configuration...');
  if (await testConnection(DEFAULT_CONFIG)) {
    console.log('API server info retrieved from default config');
    return DEFAULT_CONFIG;
  }
  
  throw new Error('API server info not found. Make sure global setup is properly configured.');
}

// 接続テスト機能
async function testConnection(config: any): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/health`, {
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch (error) {
    console.log(`Connection test failed for ${config.baseUrl}:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

// APIサーバー情報を線形リトライで取得
export async function getApiServerInfoWithRetry(maxRetries: number = 6): Promise<any> {
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
            signal: AbortSignal.timeout(3000) // 3秒に短縮
          });
          
          if (testResponse && testResponse.ok) {
            console.log(`API server connection test passed on attempt ${attempt + 1}`);
            return info;
          } else {
            console.log(`API server connection test failed: status=${testResponse?.status}`);
          }
        } catch (connectionError) {
          console.log(`API server connection test error:`, connectionError instanceof Error ? connectionError.message : String(connectionError));
        }
      } else {
        console.log(`Invalid API server info:`, info);
      }
    } catch (error) {
      console.log(`getApiServerInfo failed on attempt ${attempt + 1}:`, error instanceof Error ? error.message : String(error));
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to get API server info after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // 線形待機（最大2秒まで）
      const delay = Math.min((attempt + 1) * 500, 2000);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed to get API server info after ${maxRetries + 1} attempts`);
}

// テスト用ユーザーデータ生成（各テストで独立したユーザーを作成）
export function generateTestUser(suffix = '', testContext = '') {
  // シンプルで確実にユニークなIDを生成
  const baseId = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Date.now().toString();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  // testContextがある場合は短いハッシュを生成
  const contextPart = testContext ? 
    crypto.createHash('md5').update(testContext).digest('hex').substring(0, 6) : '';
  
  // ユニークIDを構成（シンプルで安定）
  const uniqueId = [baseId, timestamp, randomSuffix, contextPart, suffix]
    .filter(Boolean)
    .join('_');
  
  return {
    email: `test_${uniqueId}@example.com`,
    password: 'testpassword123',
    deviceId: `test_device_${uniqueId}`
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
  API_TIMEOUT: 8000,
  SETUP_TIMEOUT: 20000,
  TEST_TIMEOUT: 12000
} as const;

// テスト専用のリソース名前空間生成
export function generateTestResourceName(testName: string, resourceType: string): string {
  // シンプルで確実にユニークなIDを生成
  const baseId = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
  const timestamp = Date.now().toString();
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  
  return `${testName}_${resourceType}_${baseId}_${timestamp}_${randomSuffix}`;
}

// テストリソース管理クラス
export class TestResourceManager {
  private createdTaskLists: Map<string, any> = new Map();
  private createdTasks: Map<string, any> = new Map();
  private createdShares: Map<string, any> = new Map();
  private testName: string;

  constructor(testName: string) {
    this.testName = testName;
  }

  // タスクリスト作成
  async createTaskList(sdk: any, data: any) {
    const taskListName = generateTestResourceName(this.testName, 'tasklist');
    const result = await sdk.actions.taskLists.createTaskList({
      ...data,
      name: taskListName
    });
    
    if (result.success && result.data) {
      this.createdTaskLists.set(result.data.id, result.data);
      console.log(`Created task list: ${result.data.id} (${taskListName})`);
    }
    return result;
  }

  // タスク作成
  async createTask(sdk: any, taskListId: string, data: any) {
    const taskText = generateTestResourceName(this.testName, 'task');
    const result = await sdk.actions.tasks.createTask(taskListId, {
      ...data,
      text: taskText
    });
    
    if (result.success && result.data) {
      this.createdTasks.set(result.data.id, result.data);
      console.log(`Created task: ${result.data.id} (${taskText})`);
    }
    return result;
  }

  // 共有リンク作成
  async createShareLink(sdk: any, taskListId: string) {
    const result = await sdk.actions.share.createShareLink(taskListId);
    
    if (result.success && result.data) {
      this.createdShares.set(taskListId, result.data);
      console.log(`Created share link: ${taskListId} -> ${result.data.shareToken}`);
    }
    return result;
  }

  // 作成したタスクリストを取得
  getCreatedTaskLists(): Map<string, any> {
    return this.createdTaskLists;
  }

  // 作成したタスクを取得
  getCreatedTasks(): Map<string, any> {
    return this.createdTasks;
  }

  // 作成した共有リンクを取得
  getCreatedShares(): Map<string, any> {
    return this.createdShares;
  }

  // すべてのリソースをクリーンアップ
  async cleanupAll(sdk: any) {
    console.log(`Cleaning up resources for test: ${this.testName}`);
    
    // 共有リンクを削除
    for (const [taskListId, shareData] of this.createdShares) {
      try {
        await sdk.actions.share.deleteShareLink(taskListId);
        console.log(`Deleted share link: ${taskListId}`);
      } catch (error) {
        console.warn(`Failed to delete share link ${taskListId}:`, error);
      }
    }
    
    // タスクを削除
    for (const [taskId, taskData] of this.createdTasks) {
      try {
        await sdk.actions.tasks.deleteTask(taskData.taskListId, taskId);
        console.log(`Deleted task: ${taskId}`);
      } catch (error) {
        console.warn(`Failed to delete task ${taskId}:`, error);
      }
    }
    
    // タスクリストを削除
    for (const [taskListId, taskListData] of this.createdTaskLists) {
      try {
        await sdk.actions.taskLists.deleteTaskList(taskListId);
        console.log(`Deleted task list: ${taskListId}`);
      } catch (error) {
        console.warn(`Failed to delete task list ${taskListId}:`, error);
      }
    }
    
    // マップをクリア
    this.createdTaskLists.clear();
    this.createdTasks.clear();
    this.createdShares.clear();
    
    console.log(`Cleanup completed for test: ${this.testName}`);
  }

  // 部分的なクリーンアップ
  async cleanupTaskList(sdk: any, taskListId: string) {
    try {
      // 関連する共有リンクを削除
      if (this.createdShares.has(taskListId)) {
        await sdk.actions.share.deleteShareLink(taskListId);
        this.createdShares.delete(taskListId);
        console.log(`Deleted share link: ${taskListId}`);
      }
      
      // 関連するタスクを削除
      for (const [taskId, taskData] of this.createdTasks) {
        if (taskData.taskListId === taskListId) {
          await sdk.actions.tasks.deleteTask(taskListId, taskId);
          this.createdTasks.delete(taskId);
          console.log(`Deleted task: ${taskId}`);
        }
      }
      
      // タスクリストを削除
      await sdk.actions.taskLists.deleteTaskList(taskListId);
      this.createdTaskLists.delete(taskListId);
      console.log(`Deleted task list: ${taskListId}`);
    } catch (error) {
      console.warn(`Failed to cleanup task list ${taskListId}:`, error);
    }
  }
}

// テストケースごとの変数分離のための型定義
export interface TestContext {
  sdk: ReturnType<typeof createSDK>;
  testStorage: TestStorage;
  resourceManager?: TestResourceManager;
  testUser?: ReturnType<typeof generateTestUser>;
  apiServerInfo?: any;
}

// 複数SDKが必要なテスト用（共有機能テストなど）
export interface MultiSDKTestContext extends TestContext {
  sdkSecondary?: ReturnType<typeof createSDK>;
  testStorageSecondary?: TestStorage;
  testUserSecondary?: ReturnType<typeof generateTestUser>;
}

// テストコンテキスト作成オプション
export interface TestContextOptions {
  testName: string;
  withResourceManager?: boolean;
  withSecondarySDK?: boolean;
  withAuthentication?: boolean;
  sdkOptions?: {
    apiTimeout?: number;
    [key: string]: any;
  };
}

// テストコンテキスト作成ヘルパー
export async function createTestContext(options: TestContextOptions): Promise<TestContext> {
  const { testName, withResourceManager = false, withAuthentication = false, sdkOptions = {} } = options;
  
  // APIサーバー情報を取得
  const apiServerInfo = await getApiServerInfo();
  
  // テスト用ストレージを作成
  const testStorage = new TestStorage();
  
  // ウィンドウオブジェクトをモック
  vi.stubGlobal('window', {
    localStorage: testStorage
  });
  
  // SDKを初期化
  const sdk = createSDK({
    apiUrl: apiServerInfo.apiBaseUrl,
    apiTimeout: sdkOptions.apiTimeout || 10000,
    storage: testStorage,
    ...sdkOptions
  });
  
  // テストコンテキストの基本構造
  const context: TestContext = {
    sdk,
    testStorage,
    apiServerInfo
  };
  
  // リソースマネージャーが必要な場合
  if (withResourceManager) {
    context.resourceManager = new TestResourceManager(testName);
  }
  
  // 認証が必要な場合
  if (withAuthentication) {
    const testUser = generateTestUser(testName.replace(/[^a-zA-Z0-9]/g, '-'), `test-context.${testName}`);
    context.testUser = testUser;
    
    const registerResult = await sdk.actions.auth.register(testUser);
    if (!registerResult.success) {
      throw new Error(`Failed to authenticate test user: ${JSON.stringify(registerResult.error)}`);
    }
  }
  
  return context;
}

// 複数SDK用テストコンテキスト作成ヘルパー
export async function createMultiSDKTestContext(options: TestContextOptions): Promise<MultiSDKTestContext> {
  // メインコンテキストを作成
  const mainContext = await createTestContext(options);
  
  // セカンダリSDKが必要な場合
  if (options.withSecondarySDK) {
    const testStorageSecondary = new TestStorage();
    
    const sdkSecondary = createSDK({
      apiUrl: mainContext.apiServerInfo.apiBaseUrl,
      apiTimeout: options.sdkOptions?.apiTimeout || 10000,
      storage: testStorageSecondary,
      ...options.sdkOptions
    });
    
    const multiContext: MultiSDKTestContext = {
      ...mainContext,
      sdkSecondary,
      testStorageSecondary
    };
    
    // セカンダリユーザーの認証が必要な場合
    if (options.withAuthentication) {
      const testUserSecondary = generateTestUser(
        `${options.testName}-secondary`.replace(/[^a-zA-Z0-9]/g, '-'), 
        `test-context.${options.testName}.secondary`
      );
      multiContext.testUserSecondary = testUserSecondary;
      
      // セカンダリストレージに切り替えて認証
      vi.stubGlobal('window', {
        localStorage: testStorageSecondary
      });
      
      const registerResult = await sdkSecondary.actions.auth.register(testUserSecondary);
      if (!registerResult.success) {
        throw new Error(`Failed to authenticate secondary test user: ${JSON.stringify(registerResult.error)}`);
      }
      
      // メインストレージに戻す
      vi.stubGlobal('window', {
        localStorage: mainContext.testStorage
      });
    }
    
    return multiContext;
  }
  
  return mainContext;
}

// テストコンテキストクリーンアップヘルパー
export async function cleanupTestContext(context: TestContext): Promise<void> {
  // リソースマネージャーによるクリーンアップ
  if (context.resourceManager) {
    await context.resourceManager.cleanupAll(context.sdk);
  }
  
  // ストレージクリア
  context.testStorage.clear();
  
  // グローバルモッククリア（最後にテストが実行される場合のみ）
  // 注意：他のテストがまだ実行中の可能性があるため、個別のテストでは実行しない
  // afterAll内でvi.unstubAllGlobals()を実行することを推奨
}

// 複数SDK用テストコンテキストクリーンアップヘルパー
export async function cleanupMultiSDKTestContext(context: MultiSDKTestContext): Promise<void> {
  // メインコンテキストのクリーンアップ
  await cleanupTestContext(context);
  
  // セカンダリストレージクリア
  if (context.testStorageSecondary) {
    context.testStorageSecondary.clear();
  }
}

