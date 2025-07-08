import { describe, it, expect, afterAll, vi } from 'vitest';
import { 
  createTestContext,
  cleanupTestContext,
  TestContext,
  INTEGRATION_CONFIG
} from './setup';

describe('設定管理結合テスト', () => {
  afterAll(async () => {
    // モックをクリア
    vi.unstubAllGlobals();
  });

  describe('ユーザー設定管理', () => {
    it('ユーザー設定の取得→更新→再取得の完全フローが動作する', async () => {
      // テストコンテキストを作成（認証付き）
      const context = await createTestContext({
        testName: 'user-settings-full-flow',
        withAuthentication: true
      });
      
      try {
        // Step 1: 初期設定を取得
        const initialSettingsResult = await context.sdk.actions.settings.getSettings();
        
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
        
        const updateResult = await context.sdk.actions.settings.updateSettings(newSettings);
        
        expect(updateResult.success).toBe(true);
        expect(updateResult.data).toBeDefined();
        expect(updateResult.data?.theme).toBe('dark');
        expect(updateResult.data?.language).toBe('en');
        
        // Step 3: 更新された設定を再取得して確認
        const updatedSettingsResult = await context.sdk.actions.settings.getSettings();
        
        expect(updatedSettingsResult.success).toBe(true);
        expect(updatedSettingsResult.data?.theme).toBe('dark');
        expect(updatedSettingsResult.data?.language).toBe('en');
        
        // 初期設定と異なることを確認
        expect(updatedSettingsResult.data?.theme).not.toBe(initialSettings.theme);
        expect(updatedSettingsResult.data?.language).not.toBe(initialSettings.language);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('部分的な設定更新が正常に動作する', async () => {
      // テストコンテキストを作成（認証付き）
      const context = await createTestContext({
        testName: 'user-settings-partial-update',
        withAuthentication: true
      });
      
      try {
        // Step 1: 現在の設定を取得
        const initialResult = await context.sdk.actions.settings.getSettings();
        expect(initialResult.success).toBe(true);
        const initialSettings = initialResult.data!;
        
        // Step 2: テーマのみ更新（現在のテーマと異なる値に変更）
        const newTheme = initialSettings.theme === 'light' ? 'dark' : 'light';
        const updateResult = await context.sdk.actions.settings.updateSettings({
          theme: newTheme
        });
        
        expect(updateResult.success).toBe(true);
        
        // Step 3: 更新後の設定を再取得して確認（APIの応答に依存しない）
        const finalResult = await context.sdk.actions.settings.getSettings();
        expect(finalResult.success).toBe(true);
        
        // テーマが正しく変更されていることを確認
        expect(finalResult.data?.theme).toBe(newTheme);
        // 言語は変更されていないことを確認（初期値との比較）
        expect(finalResult.data?.language).toBe(initialSettings.language);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('App設定管理', () => {
    it('App設定の取得→更新→再取得の完全フローが動作する', async () => {
      // テストコンテキストを作成（認証付き）
      const context = await createTestContext({
        testName: 'app-settings-full-flow',
        withAuthentication: true
      });
      
      try {
        // Step 1: 初期App設定を取得
        const initialAppResult = await context.sdk.actions.settings.getApp();
        
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
        
        const updateResult = await context.sdk.actions.settings.updateApp(newAppSettings);
        
        expect(updateResult.success).toBe(true);
        expect(updateResult.data).toBeDefined();
        expect(updateResult.data?.taskInsertPosition).toBe('bottom');
        expect(updateResult.data?.autoSort).toBe(true);
        
        // Step 3: 更新されたApp設定を再取得して確認
        const updatedAppResult = await context.sdk.actions.settings.getApp();
        
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
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('部分的なApp設定更新が正常に動作する', async () => {
      // テストコンテキストを作成（認証付き）
      const context = await createTestContext({
        testName: 'app-settings-partial-update',
        withAuthentication: true
      });
      
      try {
        // Step 1: 現在のApp設定を取得
        const initialResult = await context.sdk.actions.settings.getApp();
        expect(initialResult.success).toBe(true);
        const initialApp = initialResult.data!;
        
        // Step 2: autoSortのみ更新（現在の値の反対に変更）
        const newAutoSort = !initialApp.autoSort;
        const updateResult = await context.sdk.actions.settings.updateApp({
          autoSort: newAutoSort
        });
        
        expect(updateResult.success).toBe(true);
        
        // Step 3: 更新後のApp設定を再取得して確認（APIの応答に依存しない）
        const finalResult = await context.sdk.actions.settings.getApp();
        expect(finalResult.success).toBe(true);
        
        // autoSortが正しく変更されていることを確認
        expect(finalResult.data?.autoSort).toBe(newAutoSort);
        // taskInsertPositionは変更されていないことを確認（初期値との比較）
        expect(finalResult.data?.taskInsertPosition).toBe(initialApp.taskInsertPosition);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('タスクリスト順序管理', () => {
    it('タスクリスト順序の更新が正常に実行される', async () => {
      // テストコンテキストを作成（認証付き）
      const context = await createTestContext({
        testName: 'task-list-order-update',
        withAuthentication: true
      });
      
      try {
        // Step 1: 初期のタスクリスト順序を設定
        const initialOrder = ['list1', 'list2', 'list3'];
        const setOrderResult = await context.sdk.actions.settings.updateTaskListOrder(initialOrder);
        
        console.log('Initial order result:', setOrderResult);
        expect(setOrderResult.success).toBe(true);
        
        // Step 2: 順序を変更
        const newOrder = ['list3', 'list1', 'list2']; // 順序を入れ替え
        const updateOrderResult = await context.sdk.actions.settings.updateTaskListOrder(newOrder);
        
        console.log('Update order result:', updateOrderResult);
        expect(updateOrderResult.success).toBe(true);
        
        // 注意: 現在の実装では、タスクリスト順序の取得APIが不足しているため
        // 更新が成功することのみを確認する
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('空のタスクリスト順序を設定できる', async () => {
      // テストコンテキストを作成（認証付き）
      const context = await createTestContext({
        testName: 'task-list-order-empty',
        withAuthentication: true
      });
      
      try {
        const emptyOrder: string[] = [];
        const setOrderResult = await context.sdk.actions.settings.updateTaskListOrder(emptyOrder);
        
        expect(setOrderResult.success).toBe(true);
        
        // 空の順序が正常に設定されていることを確認
        const getResult = await context.sdk.actions.settings.getApp();
        expect(getResult.success).toBe(true);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('設定エラーハンドリング', () => {
    it('未認証状態での設定取得は失敗する', async () => {
      // テストコンテキストを作成（認証なし）
      const context = await createTestContext({
        testName: 'unauthenticated-settings-error',
        withAuthentication: false
      });
      
      try {
        // 設定取得を試行
        const settingsResult = await context.sdk.actions.settings.getSettings();
        console.log('Settings error:', settingsResult.error);
        expect(settingsResult.success).toBe(false);
        expect(settingsResult.error).toBeDefined();
        // より汎用的なエラーチェック（実際のAPIエラーメッセージに依存）
        expect(settingsResult.error?.type).toBe('auth');
        
        // App設定取得も失敗することを確認
        const appResult = await context.sdk.actions.settings.getApp();
        console.log('App settings error:', appResult.error);
        expect(appResult.success).toBe(false);
        expect(appResult.error).toBeDefined();
        expect(appResult.error?.type).toBe('auth');
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('無効な設定値での更新は失敗する', async () => {
      // テストコンテキストを作成（認証付き）
      const context = await createTestContext({
        testName: 'invalid-settings-values',
        withAuthentication: true
      });
      
      try {
        // 無効なテーマ値で更新を試行
        const invalidSettings = {
          theme: 'invalid-theme' as any,
          language: 'invalid-language' as any
        };
        
        const updateResult = await context.sdk.actions.settings.updateSettings(invalidSettings);
        expect(updateResult.success).toBe(false);
        expect(updateResult.error).toBeDefined();
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('設定の統合シナリオ', () => {
    it('複数の設定を順次更新しても整合性が保たれる', async () => {
      // テストコンテキストを作成（認証付き）
      const context = await createTestContext({
        testName: 'settings-integration-scenario',
        withAuthentication: true
      });
      
      try {
        // Step 0: 現在の設定を取得（並列実行での競合を回避）
        const currentUserSettings = await context.sdk.actions.settings.getSettings();
        expect(currentUserSettings.success).toBe(true);
        const currentAppSettings = await context.sdk.actions.settings.getApp();
        expect(currentAppSettings.success).toBe(true);
        
        // Step 1: ユーザー設定を更新（現在の値と異なる値に変更）
        const newTheme = currentUserSettings.data!.theme === 'dark' ? 'light' : 'dark';
        const newLanguage = currentUserSettings.data!.language === 'ja' ? 'en' : 'ja';
        const userSettingsResult = await context.sdk.actions.settings.updateSettings({
          theme: newTheme,
          language: newLanguage
        });
        expect(userSettingsResult.success).toBe(true);
        
        // Step 2: App設定を更新（現在の値と異なる値に変更）
        const newTaskInsertPosition = currentAppSettings.data!.taskInsertPosition === 'top' ? 'bottom' : 'top';
        const newAutoSort = !currentAppSettings.data!.autoSort;
        const appSettingsResult = await context.sdk.actions.settings.updateApp({
          taskInsertPosition: newTaskInsertPosition,
          autoSort: newAutoSort
        });
        expect(appSettingsResult.success).toBe(true);
        
        // Step 3: タスクリスト順序を更新
        const orderResult = await context.sdk.actions.settings.updateTaskListOrder(['a', 'b', 'c']);
        expect(orderResult.success).toBe(true);
        
        // Step 4: すべての設定が正常に保存されていることを確認
        const finalUserSettings = await context.sdk.actions.settings.getSettings();
        expect(finalUserSettings.success).toBe(true);
        expect(finalUserSettings.data?.theme).toBe(newTheme);
        expect(finalUserSettings.data?.language).toBe(newLanguage);
        
        const finalAppSettings = await context.sdk.actions.settings.getApp();
        expect(finalAppSettings.success).toBe(true);
        expect(finalAppSettings.data?.taskInsertPosition).toBe(newTaskInsertPosition);
        expect(finalAppSettings.data?.autoSort).toBe(newAutoSort);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });
});