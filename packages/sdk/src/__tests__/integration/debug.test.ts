import { describe, it, expect, afterAll, vi } from 'vitest';
import { 
  createTestContext,
  cleanupTestContext,
  TestContext,
  INTEGRATION_CONFIG,
  healthCheckRequest,
  apiRequest
} from './setup';

describe('デバッグテスト', () => {
  afterAll(async () => {
    // モックをクリア
    vi.unstubAllGlobals();
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
  }, INTEGRATION_CONFIG.TEST_TIMEOUT);

  it('直接APIを呼び出してユーザー登録を確認', async () => {
    // テストコンテキストを作成（ユーザー生成のため）
    const context = await createTestContext({
      testName: 'direct-api-registration',
      withAuthentication: false
    });
    
    try {
      const testUser = context.testUser || {
        email: `test_direct_api_${Date.now()}@example.com`,
        password: 'testpassword123',
        deviceId: `test_device_direct_api_${Date.now()}`
      };
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
    } finally {
      // テストコンテキストをクリーンアップ
      await cleanupTestContext(context);
    }
  }, INTEGRATION_CONFIG.TEST_TIMEOUT);

  it('SDKのHTTP通信機能をテスト', async () => {
    // テストコンテキストを作成（認証なし）
    const context = await createTestContext({
      testName: 'sdk-http-communication',
      withAuthentication: false
    });
    
    try {
      // SDKの公開されたAPIを使用してHTTP通信をテスト
      // ヘルスチェック相当として、未認証でもアクセス可能なAPIを使用
      const testUser = {
        email: `test_http_${Date.now()}@example.com`,
        password: 'testpassword123',
        deviceId: `test_device_http_${Date.now()}`
      };
      const response = await context.sdk.actions.auth.register(testUser);
      console.log('SDK HTTP communication test:', response.success);
      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');
    } catch (error) {
      console.log('SDK HTTP communication error:', error);
      throw error;
    } finally {
      // テストコンテキストをクリーンアップ
      await cleanupTestContext(context);
    }
  }, INTEGRATION_CONFIG.TEST_TIMEOUT);

  it('SDKでユーザー登録を試行', async () => {
    // テストコンテキストを作成（認証なし）
    const context = await createTestContext({
      testName: 'sdk-user-registration',
      withAuthentication: false
    });
    
    try {
      const testUser = {
        email: `test_sdk_register_${Date.now()}@example.com`,
        password: 'testpassword123',
        deviceId: `test_device_sdk_register_${Date.now()}`
      };
      console.log('Attempting SDK register with user:', testUser);
      
      const result = await context.sdk.actions.auth.register(testUser);
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
    } finally {
      // テストコンテキストをクリーンアップ
      await cleanupTestContext(context);
    }
  }, INTEGRATION_CONFIG.TEST_TIMEOUT);
});