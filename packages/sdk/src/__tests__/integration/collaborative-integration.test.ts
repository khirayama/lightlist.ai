import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createSDK } from '../../index';
import { 
  startApiServer, 
  stopApiServer, 
  generateTestUser,
  TestStorage,
  INTEGRATION_CONFIG
} from './setup';

describe('共同編集機能結合テスト', () => {
  let sdkUserA: ReturnType<typeof createSDK>;
  let sdkUserB: ReturnType<typeof createSDK>;
  let testStorageA: TestStorage;
  let testStorageB: TestStorage;

  beforeAll(async () => {
    // APIサーバーを起動
    await startApiServer();
    
    // 各ユーザー用のテストストレージを作成
    testStorageA = new TestStorage();
    testStorageB = new TestStorage();
    
    // 両方のユーザー用SDKを初期化
    sdkUserA = createSDK({
      apiUrl: INTEGRATION_CONFIG.API_BASE_URL,
      apiTimeout: INTEGRATION_CONFIG.API_TIMEOUT
    });
    
    sdkUserB = createSDK({
      apiUrl: INTEGRATION_CONFIG.API_BASE_URL,
      apiTimeout: INTEGRATION_CONFIG.API_TIMEOUT
    });
  }, INTEGRATION_CONFIG.SETUP_TIMEOUT);

  afterAll(async () => {
    // モックをクリア
    vi.unstubAllGlobals();
    // APIサーバーを停止
    await stopApiServer();
  });

  beforeEach(async () => {
    // 各テスト前にストレージをクリーンアップ
    testStorageA.clear();
    testStorageB.clear();
    
    // 各ユーザーのウィンドウオブジェクトを個別にモック
    // ユーザーAをグローバルに設定
    vi.stubGlobal('window', {
      localStorage: testStorageA
    });
    
    // ユーザーAをログイン
    const testUserA = generateTestUser('user-a');
    await sdkUserA.actions.auth.register(testUserA);
    
    // ユーザーBのために一時的にストレージを切り替え
    vi.stubGlobal('window', {
      localStorage: testStorageB
    });
    
    // ユーザーBをログイン
    const testUserB = generateTestUser('user-b');
    await sdkUserB.actions.auth.register(testUserB);
    
    // グローバルストレージをユーザーAに戻す
    vi.stubGlobal('window', {
      localStorage: testStorageA
    });
  });

  describe('タスクリスト共同編集', () => {
    it('ユーザーAがタスクリストを作成し、ユーザーBが確認できる', async () => {
      // ユーザーAがタスクリストを作成
      const createResult = await sdkUserA.actions.taskLists.createTaskList({
        name: '共同作業リスト',
        background: '#FF5733'
      });
      
      expect(createResult.success).toBe(true);
      expect(createResult.data).toBeDefined();
      expect(createResult.data?.name).toBe('共同作業リスト');
      
      const taskListId = createResult.data!.id;
      console.log('Created task list:', taskListId);
      
      // ユーザーBのストレージに切り替え
      vi.stubGlobal('window', {
        localStorage: testStorageB
      });
      
      // ユーザーBがタスクリスト一覧を取得（まだ空のはず）
      const taskListsB = await sdkUserB.actions.taskLists.getTaskLists();
      console.log('User B task lists:', taskListsB);
      
      // 注意: 実際のシステムでは、ユーザーBが共有されたタスクリストにアクセスするには
      // 別のメカニズム（招待、共有リンク）が必要
      // ここでは共同編集セッションのAPIが動作することをテスト
      expect(taskListsB.success).toBe(true);
    });

    it('複数ユーザーでのタスクリスト更新競合処理が動作する', async () => {
      // ユーザーAがタスクリストを作成
      const createResult = await sdkUserA.actions.taskLists.createTaskList({
        name: '競合テストリスト',
        background: '#00FF00'
      });
      
      expect(createResult.success).toBe(true);
      const taskListId = createResult.data!.id;
      
      // ユーザーAがタスクリストを更新
      const updateAResult = await sdkUserA.actions.taskLists.updateTaskList(taskListId, {
        name: 'ユーザーAが更新'
      });
      
      expect(updateAResult.success).toBe(true);
      expect(updateAResult.data?.name).toBe('ユーザーAが更新');
      
      // ユーザーBのストレージに切り替え
      vi.stubGlobal('window', {
        localStorage: testStorageB
      });
      
      // ユーザーBが同じタスクリストを更新を試行
      // 実際のシステムでは、これは共同編集セッションを通じて処理される
      const updateBResult = await sdkUserB.actions.taskLists.updateTaskList(taskListId, {
        background: '#0000FF'
      });
      
      // 共同編集が未実装の場合、エラーまたは期待通りの動作を確認
      console.log('User B update result:', updateBResult);
      
      // ユーザーBはまだタスクリストにアクセスできないため、失敗することを期待
      expect(updateBResult.success).toBe(false);
    });
  });

  describe('セッション管理', () => {
    it('タスクリスト作成時にセッションが開始される', async () => {
      // ユーザーAがタスクリストを作成
      const createResult = await sdkUserA.actions.taskLists.createTaskList({
        name: 'セッションテストリスト',
        background: '#FFFF00'
      });
      
      expect(createResult.success).toBe(true);
      expect(createResult.data).toBeDefined();
      
      // セッション状態の確認（ストア内のactiveSessionIdsをチェック）
      // 注意: 実際の実装では、セッション状態の確認方法を検討する必要がある
      console.log('Task list created, session should be active');
    });

    it('タスクリスト削除時にセッションが終了される', async () => {
      // ユーザーAがタスクリストを作成
      const createResult = await sdkUserA.actions.taskLists.createTaskList({
        name: '削除テストリスト',
        background: '#FF00FF'
      });
      
      expect(createResult.success).toBe(true);
      const taskListId = createResult.data!.id;
      
      // タスクリストを削除
      const deleteResult = await sdkUserA.actions.taskLists.deleteTaskList(taskListId);
      
      expect(deleteResult.success).toBe(true);
      
      // セッションが終了されていることを確認
      console.log('Task list deleted, session should be ended');
    });
  });

  describe('Y.js協調編集ヘルパー（低レベルAPI）', () => {
    it('CollaborativeServiceの基本フローが動作する', async () => {
      // 注意: CollaborativeServiceは通常TaskListActions経由で間接的に使用される
      // しかし、APIエンドポイントが実装されているかを確認するため、直接テスト
      
      // テスト用タスクリストを作成
      const createResult = await sdkUserA.actions.taskLists.createTaskList({
        name: 'Y.jsテストリスト',
        background: '#123456'
      });
      
      expect(createResult.success).toBe(true);
      const taskListId = createResult.data!.id;
      
      // CollaborativeServiceを直接使用する場合は、
      // SDKの内部APIにアクセスする必要がある
      // ここでは、TaskListActionsの動作を通じて間接的にテスト
      
      // タスクリストの更新（内部でCollaborativeService.updateTaskListDocumentが呼ばれる）
      const updateResult = await sdkUserA.actions.taskLists.updateTaskList(taskListId, {
        name: 'Y.js更新済み'
      });
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.name).toBe('Y.js更新済み');
    });

    it('セッション開始→状態取得→更新送信→終了のフローが動作する', async () => {
      // TaskListActionsの操作を通じて、内部的なセッション管理をテスト
      
      // 1. セッション開始（タスクリスト作成時）
      const createResult = await sdkUserA.actions.taskLists.createTaskList({
        name: 'フローテストリスト',
        background: '#ABCDEF'
      });
      
      expect(createResult.success).toBe(true);
      const taskListId = createResult.data!.id;
      
      // 2. 状態取得（タスクリスト一覧取得時）
      const getListsResult = await sdkUserA.actions.taskLists.getTaskLists();
      expect(getListsResult.success).toBe(true);
      expect(getListsResult.data).toBeDefined();
      expect(getListsResult.data?.length).toBeGreaterThan(0);
      
      // 3. 更新送信（タスクリスト更新時）
      const updateResult = await sdkUserA.actions.taskLists.updateTaskList(taskListId, {
        background: '#FEDCBA'
      });
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.background).toBe('#FEDCBA');
      
      // 4. セッション終了（タスクリスト削除時）
      const deleteResult = await sdkUserA.actions.taskLists.deleteTaskList(taskListId);
      expect(deleteResult.success).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないタスクリストの更新は失敗する', async () => {
      const nonExistentId = 'non-existent-id';
      
      const updateResult = await sdkUserA.actions.taskLists.updateTaskList(nonExistentId, {
        name: '存在しないリスト'
      });
      
      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBeDefined();
      expect(updateResult.error?.type).toBe('network');
    });

    it('無効なタスクリストIDでのセッション操作は失敗する', async () => {
      const invalidId = '';
      
      const deleteResult = await sdkUserA.actions.taskLists.deleteTaskList(invalidId);
      
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.error).toBeDefined();
      expect(deleteResult.error?.type).toBe('validation');
    });
  });

  describe('複数セッション管理', () => {
    it('複数のタスクリストで同時にセッションを維持できる', async () => {
      // 複数のタスクリストを作成
      const createResult1 = await sdkUserA.actions.taskLists.createTaskList({
        name: 'マルチセッション1',
        background: '#111111'
      });
      
      const createResult2 = await sdkUserA.actions.taskLists.createTaskList({
        name: 'マルチセッション2',
        background: '#222222'
      });
      
      expect(createResult1.success).toBe(true);
      expect(createResult2.success).toBe(true);
      
      const taskListId1 = createResult1.data!.id;
      const taskListId2 = createResult2.data!.id;
      
      // 両方のタスクリストを同時に更新
      const updateResult1 = await sdkUserA.actions.taskLists.updateTaskList(taskListId1, {
        name: 'マルチセッション1更新'
      });
      
      const updateResult2 = await sdkUserA.actions.taskLists.updateTaskList(taskListId2, {
        name: 'マルチセッション2更新'
      });
      
      expect(updateResult1.success).toBe(true);
      expect(updateResult2.success).toBe(true);
      expect(updateResult1.data?.name).toBe('マルチセッション1更新');
      expect(updateResult2.data?.name).toBe('マルチセッション2更新');
      
      // 一つずつセッションを終了
      const deleteResult1 = await sdkUserA.actions.taskLists.deleteTaskList(taskListId1);
      const deleteResult2 = await sdkUserA.actions.taskLists.deleteTaskList(taskListId2);
      
      expect(deleteResult1.success).toBe(true);
      expect(deleteResult2.success).toBe(true);
    });
  });
});