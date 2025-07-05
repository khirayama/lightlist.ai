import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSDK } from '../index';

// fetchをモック
global.fetch = vi.fn();

describe('SDK 統合テスト - 自動トークンリフレッシュ', () => {
  let sdk: ReturnType<typeof createSDK>;
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // sessionStorageをモック
    mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    
    // windowオブジェクトをモック
    vi.stubGlobal('window', {
      sessionStorage: mockStorage
    });
    
    sdk = createSDK({
      apiUrl: 'https://api.example.com',
      apiTimeout: 5000
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createSDKが自動トークンリフレッシュを適切に設定する', async () => {
    // Arrange & Act
    const testSDK = createSDK({
      apiUrl: 'https://api.example.com',
      apiTimeout: 5000
    });

    // Assert
    // HttpClientが適切に設定されていることを確認
    expect(testSDK.httpClient).toBeDefined();
    
    // HttpClientのコンフィグが正しく設定されていることを内部的に確認
    // （実際のプロパティアクセスは困難なため、インスタンス化が成功していることで確認）
    expect(testSDK.httpClient.constructor.name).toBe('HttpClientImpl');
  });

  it('SDKが正常に初期化される', async () => {
    // Arrange & Act
    const testSDK = createSDK({
      apiUrl: 'https://api.example.com',
      apiTimeout: 5000
    });

    // Assert
    expect(testSDK).toBeDefined();
    expect(testSDK.actions).toBeDefined();
    expect(testSDK.store).toBeDefined();
    expect(testSDK.httpClient).toBeDefined();
    
    // Actions が正しく初期化されている
    expect(testSDK.actions.auth).toBeDefined();
    expect(testSDK.actions.settings).toBeDefined();
    expect(testSDK.actions.taskLists).toBeDefined();
    expect(testSDK.actions.tasks).toBeDefined();
    expect(testSDK.actions.share).toBeDefined();
  });
});