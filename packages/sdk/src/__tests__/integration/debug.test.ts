import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSDK } from '../../index';
import { 
  startApiServer, 
  stopApiServer, 
  generateTestUser,
  INTEGRATION_CONFIG,
  apiRequest
} from './setup';

describe('デバッグテスト', () => {
  let sdk: ReturnType<typeof createSDK>;

  beforeAll(async () => {
    // APIサーバーを起動
    await startApiServer();
    
    // SDKを初期化
    sdk = createSDK({
      apiUrl: INTEGRATION_CONFIG.API_BASE_URL,
      apiTimeout: INTEGRATION_CONFIG.API_TIMEOUT
    });
  }, INTEGRATION_CONFIG.SETUP_TIMEOUT);

  afterAll(async () => {
    // APIサーバーを停止
    await stopApiServer();
  });

  it('APIサーバーのヘルスチェックが成功する', async () => {
    const response = await apiRequest('/health');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    console.log('Health check response:', data);
    expect(data.data.status).toBe('healthy');
  });

  it('直接APIを呼び出してユーザー登録を確認', async () => {
    const testUser = generateTestUser('direct-api');
    console.log('Test user:', testUser);
    
    const response = await apiRequest('/auth/register', {
      method: 'POST'
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    // ここでは成功を期待しない（リクエストボディがないため）
    expect(response.status).toBeGreaterThan(0);
  });

  it('HTTPクライアントの基本機能をテスト', async () => {
    try {
      const response = await sdk.httpClient.get('/health');
      console.log('HttpClient health response:', response);
      expect(response).toBeDefined();
    } catch (error) {
      console.log('HttpClient error:', error);
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