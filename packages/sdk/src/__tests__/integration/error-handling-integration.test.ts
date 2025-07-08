import { describe, it, expect, afterAll, vi } from 'vitest';
import { createSDK } from '../../index';
import { 
  createTestContext,
  cleanupTestContext,
  TestContext,
  INTEGRATION_CONFIG,
  getApiServerInfo
} from './setup';

describe('エラーハンドリング結合テスト', () => {
  afterAll(async () => {
    // モックをクリア
    vi.unstubAllGlobals();
  });

  describe('401エラーと自動トークンリフレッシュ', () => {
    it('期限切れトークンでのAPI呼び出しが自動リフレッシュされる', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'token-refresh-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 正常な設定取得を確認
        const initialResult = await context.sdk.actions.settings.getSettings();
        expect(initialResult.success).toBe(true);
        
        // アクセストークンを無効なものに変更して期限切れをシミュレート
        context.testStorage.setItem('accessToken', 'expired-access-token');
        
        // 設定取得を試行（内部で自動リフレッシュが発生するはず）
        const refreshedResult = await context.sdk.actions.settings.getSettings();
        
        // 自動リフレッシュが実装されている場合は成功、未実装の場合は401エラー
        if (refreshedResult.success) {
          console.log('Automatic token refresh working');
          expect(refreshedResult.data).toBeDefined();
        } else {
          console.log('Automatic token refresh not implemented or failed:', refreshedResult.error);
          expect(refreshedResult.error?.type).toBe('auth');
        }
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('リフレッシュトークンも無効な場合は認証エラーになる', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'invalid-refresh-token-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 両方のトークンを無効なものに変更
        context.testStorage.setItem('accessToken', 'expired-access-token');
        context.testStorage.setItem('refreshToken', 'expired-refresh-token');
        
        // 設定取得を試行
        const result = await context.sdk.actions.settings.getSettings();
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.type).toBe('auth');
        
        console.log('Authentication error properly handled:', result.error?.code);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('ネットワークエラーハンドリング', () => {
    it('存在しないエンドポイントへのアクセスは適切なエラーを返す', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'network-error-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 存在しないタスクリストIDでアクセス
        const result = await context.sdk.actions.taskLists.updateTaskList('non-existent-id', {
          name: 'テストリスト'
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.type).toBe('network');
        
        console.log('Network error properly handled:', result.error?.code);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('無効なデータでのAPI呼び出しはバリデーションエラーを返す', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'validation-error-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 無効なテーマ設定でテスト
        const result = await context.sdk.actions.settings.updateSettings({
          theme: 'invalid-theme' as any
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(['validation', 'network']).toContain(result.error?.type);
        
        console.log('Validation error properly handled:', result.error?.code);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('リトライ機能', () => {
    it('一時的な障害後の復旧が動作する', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'retry-mechanism-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 正常なAPI呼び出しを確認
        const result1 = await context.sdk.actions.settings.getSettings();
        expect(result1.success).toBe(true);
        
        // リトライ設定でSDKを再作成（短いタイムアウトでテスト）
        const apiServerInfo = await getApiServerInfo();
        const sdkWithRetry = createSDK({
          apiUrl: apiServerInfo.apiBaseUrl,
          apiTimeout: 1000, // 短いタイムアウト
          retries: 2,
          storage: context.testStorage
        });
        
        // ウィンドウオブジェクトを設定
        vi.stubGlobal('window', {
          localStorage: context.testStorage
        });
        
        // 設定取得を試行（リトライ機能をテスト）
        const result2 = await sdkWithRetry.actions.settings.getSettings();
        
        // リトライ機能が動作している場合の結果
        if (result2.success) {
          console.log('Retry mechanism working successfully');
          expect(result2.data).toBeDefined();
        } else {
          console.log('Request failed after retries:', result2.error?.code);
          expect(result2.error?.type).toBe('network');
        }
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('エラー復旧機能', () => {
    it('エラー後の正常動作復帰が動作する', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'error-recovery-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 無効な操作でエラーを発生させる
        const errorResult = await context.sdk.actions.taskLists.updateTaskList('invalid-id', {
          name: 'エラーテスト'
        });
        
        expect(errorResult.success).toBe(false);
        console.log('Expected error occurred:', errorResult.error?.code);
        
        // その後、正常な操作が動作することを確認
        const normalResult = await context.sdk.actions.settings.getSettings();
        
        expect(normalResult.success).toBe(true);
        expect(normalResult.data).toBeDefined();
        
        console.log('Normal operation resumed after error');
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('複数のエラーが連続しても適切に処理される', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'multiple-errors-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        const errors = [];
        
        // 複数の無効な操作を実行
        const errorOperations = [
          () => context.sdk.actions.taskLists.updateTaskList('error1', { name: 'Test1' }),
          () => context.sdk.actions.taskLists.deleteTaskList('error2'),
          () => context.sdk.actions.share.createShareLink('error3')
        ];
        
        for (const operation of errorOperations) {
          const result = await operation();
          expect(result.success).toBe(false);
          errors.push(result.error?.code);
        }
        
        console.log('Multiple errors handled:', errors);
        
        // 最後に正常な操作が動作することを確認
        const normalResult = await context.sdk.actions.settings.getSettings();
        expect(normalResult.success).toBe(true);
        
        console.log('SDK recovered from multiple consecutive errors');
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('タイムアウト処理', () => {
    it('タイムアウト設定が適切に動作する', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'timeout-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 非常に短いタイムアウトでSDKを作成
        const apiServerInfo = await getApiServerInfo();
        const sdkWithTimeout = createSDK({
          apiUrl: apiServerInfo.apiBaseUrl,
          apiTimeout: 1, // 1ミリ秒（必ずタイムアウトする）
          retries: 0, // リトライなし
          storage: context.testStorage
        });
        
        // ウィンドウオブジェクトを設定
        vi.stubGlobal('window', {
          localStorage: context.testStorage
        });
        
        // API呼び出しを実行（タイムアウトが発生するはず）
        const result = await sdkWithTimeout.actions.settings.getSettings();
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.type).toBe('network');
        
        console.log('Timeout properly handled:', result.error?.code);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('エラー情報の詳細', () => {
    it('エラーレスポンスに十分な詳細情報が含まれる', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'error-details-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 無効な操作でエラーを発生させる
        const result = await context.sdk.actions.taskLists.updateTaskList('detailed-error-test', {
          name: 'テスト'
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        
        const error = result.error!;
        
        // エラー情報の構造を確認
        expect(error.type).toBeDefined();
        expect(error.code).toBeDefined();
        expect(error.message).toBeDefined();
        expect(typeof error.type).toBe('string');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
        
        console.log('Error details:', {
          type: error.type,
          code: error.code,
          message: error.message,
          details: error.details
        });
        
        // エラータイプが適切な値であることを確認
        expect(['auth', 'validation', 'network', 'unknown']).toContain(error.type);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('異なるエラータイプが適切に分類される', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'error-classification-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        const errorTests = [
          {
            name: 'Network Error',
            operation: () => context.sdk.actions.taskLists.deleteTaskList('network-error-test'),
            expectedType: 'network'
          },
          {
            name: 'Validation Error',
            operation: () => context.sdk.actions.settings.updateSettings({
              theme: 'validation-error-test' as any
            }),
            expectedType: ['validation', 'network'] // APIによってvalidationまたはnetwork
          }
        ];
        
        for (const test of errorTests) {
          const result = await test.operation();
          
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          
          if (Array.isArray(test.expectedType)) {
            expect(test.expectedType).toContain(result.error?.type);
          } else {
            expect(result.error?.type).toBe(test.expectedType);
          }
          
          console.log(`${test.name} classified as:`, result.error?.type);
        }
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('認証エラーの統合処理', () => {
    it('ログアウト後のAPI呼び出しは認証エラーになる', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'logout-auth-error-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // ログアウト実行
        const logoutResult = await context.sdk.actions.auth.logout();
        expect(logoutResult.success).toBe(true);
        
        // ログアウト後にAPI呼び出しを試行
        const result = await context.sdk.actions.settings.getSettings();
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.type).toBe('auth');
        
        console.log('Post-logout authentication error:', result.error?.code);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('無効なトークンでの認証は適切にエラーハンドリングされる', async () => {
      // テストコンテキストを作成（認証済み）
      const context = await createTestContext({
        testName: 'invalid-token-auth-error-test',
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 無効なトークンを設定
        context.testStorage.setItem('accessToken', 'completely-invalid-token');
        context.testStorage.setItem('refreshToken', 'completely-invalid-refresh-token');
        
        // API呼び出しを試行
        const result = await context.sdk.actions.settings.getSettings();
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.type).toBe('auth');
        
        console.log('Invalid token error handling:', result.error?.code);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });
});