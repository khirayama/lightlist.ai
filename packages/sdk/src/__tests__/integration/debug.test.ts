import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createSDK } from '../../index';
import { 
  generateTestUser,
  TestStorage,
  apiRequest,
  healthCheckRequest,
  getApiServerInfoWithRetry
} from './setup';

describe('デバッグテスト', () => {
  let sdk: ReturnType<typeof createSDK>;
  let testStorage: TestStorage;

  beforeAll(async () => {
    // APIサーバー情報を取得（リトライ機能付き）
    const apiServerInfo = await getApiServerInfoWithRetry();
    
    // テスト用ストレージを作成
    testStorage = new TestStorage();
    
    // ウィンドウオブジェクトをモック
    vi.stubGlobal('window', {
      localStorage: testStorage
    });
    
    // SDKを初期化（TestStorageを使用）
    sdk = createSDK({
      apiUrl: apiServerInfo.apiBaseUrl,
      apiTimeout: 10000,
      storage: testStorage
    });
  });

  afterAll(async () => {
    // モックをクリア
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    // 各テスト前にストレージをクリーンアップ
    testStorage.clear();
  });

  it('APIサーバーのヘルスチェックが成功する', async () => {
    const response = await healthCheckRequest();
    console.log('Health check status:', response.status);
    
    // ヘルスチェックエンドポイントが正常に動作することを確認
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    console.log('Health check response:', data);
    expect(data.data.status).toBe('healthy');
    expect(data.data.timestamp).toBeDefined();
    expect(data.data.database).toBe('connected');
    expect(data.data.services).toBeDefined();
    expect(data.data.services.auth).toBe('ok');
    expect(data.data.services.collaborative).toBe('ok');
  });

  it('直接APIを呼び出してユーザー登録を確認', async () => {
    const testUser = generateTestUser('direct-api');
    console.log('Test user:', testUser);
    
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    // ユーザー登録が成功することを期待（201 Created）
    expect(response.status).toBe(201);
  });

  it('SDKのHTTP通信機能をテスト', async () => {
    try {
      // SDKの公開されたAPIを使用してHTTP通信をテスト
      // ヘルスチェック相当として、未認証でもアクセス可能なAPIを使用
      const testUser = generateTestUser('http-test');
      const response = await sdk.actions.auth.register(testUser);
      console.log('SDK HTTP communication test:', response.success);
      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');
    } catch (error) {
      console.log('SDK HTTP communication error:', error);
      throw error;
    }
  });

  it('SDKでユーザー登録を試行', async () => {
    const testUser = generateTestUser('sdk-register');
    console.log('Attempting SDK register with user:', testUser);
    
    try {
      const result = await sdk.actions.auth.register(testUser);
      console.log('SDK register result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data?.accessToken).toBeDefined();
      } else {
        console.log('Register failed - Error details:', result.error);
      }
    } catch (error) {
      console.log('SDK register threw error:', error);
      throw error;
    }
  });
});