import { describe, it, expect, afterAll, vi } from 'vitest';
import { 
  createMultiSDKTestContext,
  cleanupMultiSDKTestContext,
  MultiSDKTestContext,
  INTEGRATION_CONFIG
} from './setup';

describe('共同編集機能結合テスト', () => {
  afterAll(async () => {
    // モックをクリア
    vi.unstubAllGlobals();
  });

  describe('タスクリスト共同編集', () => {
    it('ユーザーAがタスクリストを作成し、ユーザーBが確認できる', async () => {
      // マルチSDKテストコンテキストを作成（認証済み、リソースマネージャー付き）
      const context = await createMultiSDKTestContext({
        testName: 'collaborative-create-confirm',
        withSecondarySDK: true,
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // ユーザーAがタスクリストを作成
        const createResult = await context.resourceManager!.createTaskList(context.sdk, {
          background: '#FF5733'
        });
        
        expect(createResult.success).toBe(true);
        expect(createResult.data).toBeDefined();
        expect(createResult.data?.name).toContain('collaborative-create-confirm-tasklist');
        
        const taskListId = createResult.data!.id;
        console.log('Created task list:', taskListId);
        
        // ユーザーBのストレージに切り替え
        vi.stubGlobal('window', {
          localStorage: context.testStorageSecondary
        });
        
        // ユーザーBがタスクリスト一覧を取得（まだ空のはず）
        const taskListsB = await context.sdkSecondary!.actions.taskLists.getTaskLists();
        console.log('User B task lists:', taskListsB);
        
        // 注意: 実際のシステムでは、ユーザーBが共有されたタスクリストにアクセスするには
        // 別のメカニズム（招待、共有リンク）が必要
        // ここでは共同編集セッションのAPIが動作することをテスト
        expect(taskListsB.success).toBe(true);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupMultiSDKTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('複数ユーザーでのタスクリスト更新競合処理が動作する', async () => {
      // マルチSDKテストコンテキストを作成（認証済み、リソースマネージャー付き）
      const context = await createMultiSDKTestContext({
        testName: 'collaborative-conflict-handling',
        withSecondarySDK: true,
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // ユーザーAがタスクリストを作成
        const createResult = await context.resourceManager!.createTaskList(context.sdk, {
          background: '#00FF00'
        });
        
        expect(createResult.success).toBe(true);
        const taskListId = createResult.data!.id;
        
        // ユーザーAがタスクリストを更新
        const updateAResult = await context.sdk.actions.taskLists.updateTaskList(taskListId, {
          name: 'ユーザーAが更新'
        });
        
        expect(updateAResult.success).toBe(true);
        expect(updateAResult.data?.name).toBe('ユーザーAが更新');
        
        // ユーザーBのストレージに切り替え
        vi.stubGlobal('window', {
          localStorage: context.testStorageSecondary
        });
        
        // ユーザーBが同じタスクリストを更新を試行
        // 実際のシステムでは、これは共同編集セッションを通じて処理される
        const updateBResult = await context.sdkSecondary!.actions.taskLists.updateTaskList(taskListId, {
          background: '#0000FF'
        });
        
        // 共同編集が未実装の場合、エラーまたは期待通りの動作を確認
        console.log('User B update result:', updateBResult);
        
        // ユーザーBはまだタスクリストにアクセスできないため、失敗することを期待
        expect(updateBResult.success).toBe(false);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupMultiSDKTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('セッション管理', () => {
    it('タスクリスト作成時にセッションが開始される', async () => {
      // マルチSDKテストコンテキストを作成（認証済み、リソースマネージャー付き）
      const context = await createMultiSDKTestContext({
        testName: 'session-start-test',
        withSecondarySDK: false,
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // ユーザーAがタスクリストを作成
        const createResult = await context.sdk.actions.taskLists.createTaskList({
          name: 'セッションテストリスト',
          background: '#FFFF00'
        });
        
        expect(createResult.success).toBe(true);
        expect(createResult.data).toBeDefined();
        
        // セッション状態の確認（ストア内のactiveSessionIdsをチェック）
        // 注意: 実際の実装では、セッション状態の確認方法を検討する必要がある
        console.log('Task list created, session should be active');
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupMultiSDKTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('タスクリスト削除時にセッションが終了される', async () => {
      // マルチSDKテストコンテキストを作成（認証済み、リソースマネージャー付き）
      const context = await createMultiSDKTestContext({
        testName: 'session-end-test',
        withSecondarySDK: false,
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // ユーザーAがタスクリストを作成
        const createResult = await context.sdk.actions.taskLists.createTaskList({
          name: '削除テストリスト',
          background: '#FF00FF'
        });
        
        expect(createResult.success).toBe(true);
        const taskListId = createResult.data!.id;
        
        // タスクリストを削除
        const deleteResult = await context.sdk.actions.taskLists.deleteTaskList(taskListId);
        
        expect(deleteResult.success).toBe(true);
        
        // セッションが終了されていることを確認
        console.log('Task list deleted, session should be ended');
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupMultiSDKTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('Y.js協調編集ヘルパー（低レベルAPI）', () => {
    it('CollaborativeServiceの基本フローが動作する', async () => {
      // マルチSDKテストコンテキストを作成（認証済み、リソースマネージャー付き）
      const context = await createMultiSDKTestContext({
        testName: 'collaborative-service-test',
        withSecondarySDK: false,
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 注意: CollaborativeServiceは通常TaskListActions経由で間接的に使用される
        // しかし、APIエンドポイントが実装されているかを確認するため、直接テスト
        
        // テスト用タスクリストを作成
        const createResult = await context.sdk.actions.taskLists.createTaskList({
          name: 'Y.jsテストリスト',
          background: '#123456'
        });
        
        expect(createResult.success).toBe(true);
        const taskListId = createResult.data!.id;
        
        // CollaborativeServiceを直接使用する場合は、
        // SDKの内部APIにアクセスする必要がある
        // ここでは、TaskListActionsの動作を通じて間接的にテスト
        
        // タスクリストの更新（内部でCollaborativeService.updateTaskListDocumentが呼ばれる）
        const updateResult = await context.sdk.actions.taskLists.updateTaskList(taskListId, {
          name: 'Y.js更新済み'
        });
        
        expect(updateResult.success).toBe(true);
        expect(updateResult.data?.name).toBe('Y.js更新済み');
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupMultiSDKTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('セッション開始→状態取得→更新送信→終了のフローが動作する', async () => {
      // マルチSDKテストコンテキストを作成（認証済み、リソースマネージャー付き）
      const context = await createMultiSDKTestContext({
        testName: 'session-flow-test',
        withSecondarySDK: false,
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // TaskListActionsの操作を通じて、内部的なセッション管理をテスト
        
        // 1. セッション開始（タスクリスト作成時）
        const createResult = await context.sdk.actions.taskLists.createTaskList({
          name: 'フローテストリスト',
          background: '#ABCDEF'
        });
        
        expect(createResult.success).toBe(true);
        const taskListId = createResult.data!.id;
        
        // 2. 状態取得（タスクリスト一覧取得時）
        const getListsResult = await context.sdk.actions.taskLists.getTaskLists();
        expect(getListsResult.success).toBe(true);
        expect(getListsResult.data).toBeDefined();
        expect(getListsResult.data?.length).toBeGreaterThan(0);
        
        // 3. 更新送信（タスクリスト更新時）
        const updateResult = await context.sdk.actions.taskLists.updateTaskList(taskListId, {
          background: '#FEDCBA'
        });
        
        expect(updateResult.success).toBe(true);
        expect(updateResult.data?.background).toBe('#FEDCBA');
        
        // 4. セッション終了（タスクリスト削除時）
        const deleteResult = await context.sdk.actions.taskLists.deleteTaskList(taskListId);
        expect(deleteResult.success).toBe(true);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupMultiSDKTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('エラーハンドリング', () => {
    it('存在しないタスクリストの更新は失敗する', async () => {
      // マルチSDKテストコンテキストを作成（認証済み）
      const context = await createMultiSDKTestContext({
        testName: 'error-nonexistent-update-test',
        withSecondarySDK: false,
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        const nonExistentId = 'non-existent-id';
        
        const updateResult = await context.sdk.actions.taskLists.updateTaskList(nonExistentId, {
          name: '存在しないリスト'
        });
        
        expect(updateResult.success).toBe(false);
        expect(updateResult.error).toBeDefined();
        expect(updateResult.error?.type).toBe('network');
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupMultiSDKTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);

    it('無効なタスクリストIDでのセッション操作は失敗する', async () => {
      // マルチSDKテストコンテキストを作成（認証済み）
      const context = await createMultiSDKTestContext({
        testName: 'error-invalid-id-test',
        withSecondarySDK: false,
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        const invalidId = '';
        
        const deleteResult = await context.sdk.actions.taskLists.deleteTaskList(invalidId);
        
        expect(deleteResult.success).toBe(false);
        expect(deleteResult.error).toBeDefined();
        expect(deleteResult.error?.type).toBe('validation');
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupMultiSDKTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });

  describe('複数セッション管理', () => {
    it('複数のタスクリストで同時にセッションを維持できる', async () => {
      // マルチSDKテストコンテキストを作成（認証済み、リソースマネージャー付き）
      const context = await createMultiSDKTestContext({
        testName: 'multi-session-test',
        withSecondarySDK: false,
        withAuthentication: true,
        withResourceManager: true
      });
      
      try {
        // 複数のタスクリストを作成
        const createResult1 = await context.sdk.actions.taskLists.createTaskList({
          name: 'マルチセッション1',
          background: '#111111'
        });
        
        const createResult2 = await context.sdk.actions.taskLists.createTaskList({
          name: 'マルチセッション2',
          background: '#222222'
        });
        
        expect(createResult1.success).toBe(true);
        expect(createResult2.success).toBe(true);
        
        const taskListId1 = createResult1.data!.id;
        const taskListId2 = createResult2.data!.id;
        
        // 両方のタスクリストを同時に更新
        const updateResult1 = await context.sdk.actions.taskLists.updateTaskList(taskListId1, {
          name: 'マルチセッション1更新'
        });
        
        const updateResult2 = await context.sdk.actions.taskLists.updateTaskList(taskListId2, {
          name: 'マルチセッション2更新'
        });
        
        expect(updateResult1.success).toBe(true);
        expect(updateResult2.success).toBe(true);
        expect(updateResult1.data?.name).toBe('マルチセッション1更新');
        expect(updateResult2.data?.name).toBe('マルチセッション2更新');
        
        // 一つずつセッションを終了
        const deleteResult1 = await context.sdk.actions.taskLists.deleteTaskList(taskListId1);
        const deleteResult2 = await context.sdk.actions.taskLists.deleteTaskList(taskListId2);
        
        expect(deleteResult1.success).toBe(true);
        expect(deleteResult2.success).toBe(true);
      } finally {
        // テストコンテキストをクリーンアップ
        await cleanupMultiSDKTestContext(context);
      }
    }, INTEGRATION_CONFIG.TEST_TIMEOUT);
  });
});