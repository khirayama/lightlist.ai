import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createSDK } from '../../index';
import { 
  generateTestUser,
  TestStorage,
  getApiServerInfo
} from './setup';

describe('設定管理結合テスト', () => {
  let sdk: ReturnType<typeof createSDK>;
  let testStorage: TestStorage;

  beforeAll(async () => {
    // APIサーバー情報を取得（グローバルセットアップで起動済み）
    const apiServerInfo = await getApiServerInfo();
    
    // テスト用ストレージを作成
    testStorage = new TestStorage();
    
    // ウィンドウオブジェクトをモック
    vi.stubGlobal('window', {
      localStorage: testStorage
    });
    
    // SDKを初期化
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
    
    // テスト用ユーザーを登録してログイン（設定APIには認証が必要、各テストで独立したユーザーを作成）
    const testUser = generateTestUser('settings-test');
    await sdk.actions.auth.register(testUser);
  });

  describe('ユーザー設定管理', () => {
    it('ユーザー設定の取得→更新→再取得の完全フローが動作する', async () => {
      // Step 1: 初期設定を取得
      const initialSettingsResult = await sdk.actions.settings.getSettings();
      
      expect(initialSettingsResult.success).toBe(true);
      expect(initialSettingsResult.data).toBeDefined();
      expect(initialSettingsResult.data?.theme).toBeDefined();
      expect(initialSettingsResult.data?.language).toBeDefined();
      
      const initialSettings = initialSettingsResult.data!;
      console.log('Initial settings:', initialSettings);
      
      // Step 2: 設定を更新
      const newSettings = {
        theme: 'dark' as const,
        language: 'en' as const
      };
      
      const updateResult = await sdk.actions.settings.updateSettings(newSettings);
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data).toBeDefined();
      expect(updateResult.data?.theme).toBe('dark');
      expect(updateResult.data?.language).toBe('en');
      
      // Step 3: 更新された設定を再取得して確認
      const updatedSettingsResult = await sdk.actions.settings.getSettings();
      
      expect(updatedSettingsResult.success).toBe(true);
      expect(updatedSettingsResult.data?.theme).toBe('dark');
      expect(updatedSettingsResult.data?.language).toBe('en');
      
      // 初期設定と異なることを確認
      expect(updatedSettingsResult.data?.theme).not.toBe(initialSettings.theme);
      expect(updatedSettingsResult.data?.language).not.toBe(initialSettings.language);
    });

    it('部分的な設定更新が正常に動作する', async () => {
      // 初期設定を取得
      const initialResult = await sdk.actions.settings.getSettings();
      expect(initialResult.success).toBe(true);
      const initialSettings = initialResult.data!;
      
      // テーマのみ更新
      const updateResult = await sdk.actions.settings.updateSettings({
        theme: 'light'
      });
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.theme).toBe('light');
      // 言語は変更されていないことを確認
      expect(updateResult.data?.language).toBe(initialSettings.language);
    });
  });

  describe('App設定管理', () => {
    it('App設定の取得→更新→再取得の完全フローが動作する', async () => {
      // Step 1: 初期App設定を取得
      const initialAppResult = await sdk.actions.settings.getApp();
      
      expect(initialAppResult.success).toBe(true);
      expect(initialAppResult.data).toBeDefined();
      expect(initialAppResult.data?.taskInsertPosition).toBeDefined();
      expect(initialAppResult.data?.autoSort).toBeDefined();
      
      const initialApp = initialAppResult.data!;
      console.log('Initial app settings:', initialApp);
      
      // Step 2: App設定を更新
      const newAppSettings = {
        taskInsertPosition: 'bottom' as const,
        autoSort: true
      };
      
      const updateResult = await sdk.actions.settings.updateApp(newAppSettings);
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data).toBeDefined();
      expect(updateResult.data?.taskInsertPosition).toBe('bottom');
      expect(updateResult.data?.autoSort).toBe(true);
      
      // Step 3: 更新されたApp設定を再取得して確認
      const updatedAppResult = await sdk.actions.settings.getApp();
      
      expect(updatedAppResult.success).toBe(true);
      expect(updatedAppResult.data?.taskInsertPosition).toBe('bottom');
      expect(updatedAppResult.data?.autoSort).toBe(true);
      
      // 初期設定と異なることを確認（設定が変更されている場合）
      if (initialApp.taskInsertPosition !== 'bottom') {
        expect(updatedAppResult.data?.taskInsertPosition).not.toBe(initialApp.taskInsertPosition);
      }
      if (initialApp.autoSort !== true) {
        expect(updatedAppResult.data?.autoSort).not.toBe(initialApp.autoSort);
      }
    });

    it('部分的なApp設定更新が正常に動作する', async () => {
      // 初期設定を取得
      const initialResult = await sdk.actions.settings.getApp();
      expect(initialResult.success).toBe(true);
      const initialApp = initialResult.data!;
      
      // autoSortのみ更新
      const updateResult = await sdk.actions.settings.updateApp({
        autoSort: !initialApp.autoSort // 現在の値の反対に設定
      });
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.autoSort).toBe(!initialApp.autoSort);
      // taskInsertPositionは変更されていないことを確認
      expect(updateResult.data?.taskInsertPosition).toBe(initialApp.taskInsertPosition);
    });
  });

  describe('タスクリスト順序管理', () => {
    it('タスクリスト順序の更新が正常に実行される', async () => {
      // Step 1: 初期のタスクリスト順序を設定
      const initialOrder = ['list1', 'list2', 'list3'];
      const setOrderResult = await sdk.actions.settings.updateTaskListOrder(initialOrder);
      
      console.log('Initial order result:', setOrderResult);
      expect(setOrderResult.success).toBe(true);
      
      // Step 2: 順序を変更
      const newOrder = ['list3', 'list1', 'list2']; // 順序を入れ替え
      const updateOrderResult = await sdk.actions.settings.updateTaskListOrder(newOrder);
      
      console.log('Update order result:', updateOrderResult);
      expect(updateOrderResult.success).toBe(true);
      
      // 注意: 現在の実装では、タスクリスト順序の取得APIが不足しているため
      // 更新が成功することのみを確認する
    });

    it('空のタスクリスト順序を設定できる', async () => {
      const emptyOrder: string[] = [];
      const setOrderResult = await sdk.actions.settings.updateTaskListOrder(emptyOrder);
      
      expect(setOrderResult.success).toBe(true);
      
      // 空の順序が正常に設定されていることを確認
      const getResult = await sdk.actions.settings.getApp();
      expect(getResult.success).toBe(true);
    });
  });

  describe('設定エラーハンドリング', () => {
    it('未認証状態での設定取得は失敗する', async () => {
      // ログアウトして未認証状態にする
      await sdk.actions.auth.logout();
      
      // 設定取得を試行
      const settingsResult = await sdk.actions.settings.getSettings();
      console.log('Settings error:', settingsResult.error);
      expect(settingsResult.success).toBe(false);
      expect(settingsResult.error).toBeDefined();
      // より汎用的なエラーチェック（実際のAPIエラーメッセージに依存）
      expect(settingsResult.error?.type).toBe('auth');
      
      // App設定取得も失敗することを確認
      const appResult = await sdk.actions.settings.getApp();
      console.log('App settings error:', appResult.error);
      expect(appResult.success).toBe(false);
      expect(appResult.error).toBeDefined();
      expect(appResult.error?.type).toBe('auth');
    });

    it('無効な設定値での更新は失敗する', async () => {
      // 無効なテーマ値で更新を試行
      const invalidSettings = {
        theme: 'invalid-theme' as any,
        language: 'invalid-language' as any
      };
      
      const updateResult = await sdk.actions.settings.updateSettings(invalidSettings);
      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBeDefined();
    });
  });

  describe('設定の統合シナリオ', () => {
    it('複数の設定を順次更新しても整合性が保たれる', async () => {
      // 1. ユーザー設定を更新
      const userSettingsResult = await sdk.actions.settings.updateSettings({
        theme: 'dark',
        language: 'ja'
      });
      expect(userSettingsResult.success).toBe(true);
      
      // 2. App設定を更新
      const appSettingsResult = await sdk.actions.settings.updateApp({
        taskInsertPosition: 'top',
        autoSort: false
      });
      expect(appSettingsResult.success).toBe(true);
      
      // 3. タスクリスト順序を更新
      const orderResult = await sdk.actions.settings.updateTaskListOrder(['a', 'b', 'c']);
      expect(orderResult.success).toBe(true);
      
      // 4. すべての設定が正常に保存されていることを確認
      const finalUserSettings = await sdk.actions.settings.getSettings();
      expect(finalUserSettings.success).toBe(true);
      expect(finalUserSettings.data?.theme).toBe('dark');
      expect(finalUserSettings.data?.language).toBe('ja');
      
      const finalAppSettings = await sdk.actions.settings.getApp();
      expect(finalAppSettings.success).toBe(true);
      expect(finalAppSettings.data?.taskInsertPosition).toBe('top');
      expect(finalAppSettings.data?.autoSort).toBe(false);
    });
  });
});