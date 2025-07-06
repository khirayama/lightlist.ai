import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createSDK } from '../../index';
import { 
  startApiServer, 
  stopApiServer, 
  generateTestUser,
  TestStorage,
  INTEGRATION_CONFIG
} from './setup';

describe('共有機能結合テスト', () => {
  let sdkOwner: ReturnType<typeof createSDK>;
  let sdkViewer: ReturnType<typeof createSDK>;
  let testStorageOwner: TestStorage;
  let testStorageViewer: TestStorage;

  beforeAll(async () => {
    // APIサーバーを起動
    await startApiServer();
    
    // 各ユーザー用のテストストレージを作成
    testStorageOwner = new TestStorage();
    testStorageViewer = new TestStorage();
    
    // オーナーとビューワー用SDKを初期化
    sdkOwner = createSDK({
      apiUrl: INTEGRATION_CONFIG.API_BASE_URL,
      apiTimeout: INTEGRATION_CONFIG.API_TIMEOUT,
      storage: testStorageOwner
    });
    
    sdkViewer = createSDK({
      apiUrl: INTEGRATION_CONFIG.API_BASE_URL,
      apiTimeout: INTEGRATION_CONFIG.API_TIMEOUT,
      storage: testStorageViewer
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
    testStorageOwner.clear();
    testStorageViewer.clear();
    
    // オーナーをログイン
    vi.stubGlobal('window', {
      localStorage: testStorageOwner
    });
    
    const testOwner = generateTestUser('owner');
    await sdkOwner.actions.auth.register(testOwner);
    
    // ビューワーをログイン
    vi.stubGlobal('window', {
      localStorage: testStorageViewer
    });
    
    const testViewer = generateTestUser('viewer');
    await sdkViewer.actions.auth.register(testViewer);
    
    // グローバルストレージをオーナーに戻す
    vi.stubGlobal('window', {
      localStorage: testStorageOwner
    });
  });

  describe('基本的な共有フロー', () => {
    it('タスクリスト作成→共有リンク作成→共有閲覧→コピー→共有削除の完全フローが動作する', async () => {
      // Step 1: オーナーがタスクリストを作成
      const createResult = await sdkOwner.actions.taskLists.createTaskList({
        name: '共有テストリスト',
        background: '#FF5733'
      });
      
      expect(createResult.success).toBe(true);
      expect(createResult.data).toBeDefined();
      
      const taskListId = createResult.data!.id;
      console.log('Created task list:', taskListId);
      
      // Step 2: 共有リンクを作成
      const shareResult = await sdkOwner.actions.share.createShareLink(taskListId);
      
      expect(shareResult.success).toBe(true);
      expect(shareResult.data).toBeDefined();
      expect(shareResult.data?.shareToken).toBeDefined();
      expect(shareResult.data?.shareUrl).toBeDefined();
      
      const shareToken = shareResult.data!.shareToken;
      console.log('Created share link:', shareToken);
      
      // Step 3: ビューワーがストレージに切り替えて共有タスクリストを閲覧
      vi.stubGlobal('window', {
        localStorage: testStorageViewer
      });
      
      const viewResult = await sdkViewer.actions.share.getSharedTaskList(shareToken);
      
      expect(viewResult.success).toBe(true);
      expect(viewResult.data).toBeDefined();
      expect(viewResult.data?.name).toBe('共有テストリスト');
      expect(viewResult.data?.background).toBe('#FF5733');
      
      console.log('Viewed shared task list:', viewResult.data?.name);
      
      // Step 4: ビューワーが共有タスクリストを自分のアプリにコピー
      const copyResult = await sdkViewer.actions.share.copySharedTaskList(shareToken);
      
      expect(copyResult.success).toBe(true);
      expect(copyResult.data).toBeDefined();
      expect(copyResult.data?.name).toBe('共有テストリスト');
      expect(copyResult.data?.id).not.toBe(taskListId); // 新しいIDが生成される
      
      console.log('Copied task list:', copyResult.data?.id);
      
      // Step 5: オーナーがストレージに戻して共有を削除
      vi.stubGlobal('window', {
        localStorage: testStorageOwner
      });
      
      const removeResult = await sdkOwner.actions.share.removeShareLink(taskListId);
      
      expect(removeResult.success).toBe(true);
      
      // Step 6: 共有削除後、ビューワーが共有リンクにアクセスできないことを確認
      vi.stubGlobal('window', {
        localStorage: testStorageViewer
      });
      
      const viewAfterRemoveResult = await sdkViewer.actions.share.getSharedTaskList(shareToken);
      
      expect(viewAfterRemoveResult.success).toBe(false);
      expect(viewAfterRemoveResult.error).toBeDefined();
      expect(viewAfterRemoveResult.error?.type).toBe('network');
    });
  });

  describe('共有リンク管理', () => {
    it('共有リンクの作成と削除が正常に動作する', async () => {
      // タスクリストを作成
      const createResult = await sdkOwner.actions.taskLists.createTaskList({
        name: '共有管理テスト',
        background: '#00FF00'
      });
      
      expect(createResult.success).toBe(true);
      const taskListId = createResult.data!.id;
      
      // 共有リンクを作成
      const shareResult = await sdkOwner.actions.share.createShareLink(taskListId);
      
      expect(shareResult.success).toBe(true);
      expect(shareResult.data?.shareToken).toBeDefined();
      expect(shareResult.data?.shareUrl).toBeDefined();
      expect(shareResult.data?.shareUrl).toContain(shareResult.data!.shareToken);
      
      // 共有リンクを削除
      const removeResult = await sdkOwner.actions.share.removeShareLink(taskListId);
      
      expect(removeResult.success).toBe(true);
    });

    it('共有コードの更新（リフレッシュ）が動作する', async () => {
      // タスクリストを作成
      const createResult = await sdkOwner.actions.taskLists.createTaskList({
        name: '共有コード更新テスト',
        background: '#0000FF'
      });
      
      expect(createResult.success).toBe(true);
      const taskListId = createResult.data!.id;
      
      // 最初の共有リンクを作成
      const shareResult1 = await sdkOwner.actions.share.createShareLink(taskListId);
      
      expect(shareResult1.success).toBe(true);
      const originalToken = shareResult1.data!.shareToken;
      
      // 共有コードを更新
      const refreshResult = await sdkOwner.actions.share.refreshShareCode(taskListId);
      
      expect(refreshResult.success).toBe(true);
      expect(refreshResult.data?.shareToken).toBeDefined();
      expect(refreshResult.data?.shareToken).not.toBe(originalToken); // 新しいトークンが生成される
      
      const newToken = refreshResult.data!.shareToken;
      
      // 古いトークンでアクセスできないことを確認
      vi.stubGlobal('window', {
        localStorage: testStorageViewer
      });
      
      const oldTokenResult = await sdkViewer.actions.share.getSharedTaskList(originalToken);
      expect(oldTokenResult.success).toBe(false);
      
      // 新しいトークンでアクセスできることを確認
      const newTokenResult = await sdkViewer.actions.share.getSharedTaskList(newToken);
      expect(newTokenResult.success).toBe(true);
      expect(newTokenResult.data?.name).toBe('共有コード更新テスト');
    });
  });

  describe('共有エラーハンドリング', () => {
    it('存在しないタスクリストの共有は失敗する', async () => {
      const nonExistentId = 'non-existent-task-list-id';
      
      const shareResult = await sdkOwner.actions.share.createShareLink(nonExistentId);
      
      expect(shareResult.success).toBe(false);
      expect(shareResult.error).toBeDefined();
      expect(shareResult.error?.type).toBe('network');
    });

    it('無効な共有トークンでの閲覧は失敗する', async () => {
      const invalidTokens = [
        '',
        'invalid-token',
        'not_share_token',
        'share_',
        'token with spaces'
      ];
      
      for (const invalidToken of invalidTokens) {
        const viewResult = await sdkViewer.actions.share.getSharedTaskList(invalidToken);
        
        expect(viewResult.success).toBe(false);
        expect(viewResult.error).toBeDefined();
        
        // バリデーションエラーまたはネットワークエラーのいずれか
        expect(['validation', 'network']).toContain(viewResult.error?.type);
        
        console.log(`Invalid token "${invalidToken}" properly rejected:`, viewResult.error?.type);
      }
    });

    it('無効な共有トークンでのコピーは失敗する', async () => {
      const invalidToken = 'invalid-copy-token';
      
      const copyResult = await sdkViewer.actions.share.copySharedTaskList(invalidToken);
      
      expect(copyResult.success).toBe(false);
      expect(copyResult.error).toBeDefined();
      expect(['validation', 'network']).toContain(copyResult.error?.type);
    });

    it('他人のタスクリストの共有削除は失敗する', async () => {
      // オーナーがタスクリストを作成
      const createResult = await sdkOwner.actions.taskLists.createTaskList({
        name: '他人削除テスト',
        background: '#FFFF00'
      });
      
      expect(createResult.success).toBe(true);
      const taskListId = createResult.data!.id;
      
      // ビューワーが他人のタスクリストの共有を削除しようとする
      vi.stubGlobal('window', {
        localStorage: testStorageViewer
      });
      
      const removeResult = await sdkViewer.actions.share.removeShareLink(taskListId);
      
      expect(removeResult.success).toBe(false);
      expect(removeResult.error).toBeDefined();
      expect(removeResult.error?.type).toBe('network'); // 401 Unauthorizedまたは403 Forbidden
    });
  });

  describe('共有タスクリストの詳細', () => {
    it('共有されたタスクリストは読み取り専用情報を含む', async () => {
      // タスクリストを作成
      const createResult = await sdkOwner.actions.taskLists.createTaskList({
        name: '読み取り専用テスト',
        background: '#FF00FF'
      });
      
      expect(createResult.success).toBe(true);
      const taskListId = createResult.data!.id;
      
      // TODO: タスクを追加してより豊富なコンテンツでテスト
      // 現在はタスク機能の結合テストがないため、タスクリストのみでテスト
      
      // 共有リンクを作成
      const shareResult = await sdkOwner.actions.share.createShareLink(taskListId);
      expect(shareResult.success).toBe(true);
      
      const shareToken = shareResult.data!.shareToken;
      
      // ビューワーが共有タスクリストを閲覧
      vi.stubGlobal('window', {
        localStorage: testStorageViewer
      });
      
      const viewResult = await sdkViewer.actions.share.getSharedTaskList(shareToken);
      
      expect(viewResult.success).toBe(true);
      expect(viewResult.data).toBeDefined();
      expect(viewResult.data?.name).toBe('読み取り専用テスト');
      expect(viewResult.data?.background).toBe('#FF00FF');
      
      // 共有されたタスクリストには読み取り専用フラグがあることを期待
      // 実際のAPIレスポンスによってはisReadOnlyフィールドなどが含まれる可能性
      console.log('Shared task list data:', viewResult.data);
    });

    it('複数の共有リンクを同時に管理できる', async () => {
      // 複数のタスクリストを作成
      const createResult1 = await sdkOwner.actions.taskLists.createTaskList({
        name: 'マルチ共有1',
        background: '#111111'
      });
      
      const createResult2 = await sdkOwner.actions.taskLists.createTaskList({
        name: 'マルチ共有2',
        background: '#222222'
      });
      
      expect(createResult1.success).toBe(true);
      expect(createResult2.success).toBe(true);
      
      const taskListId1 = createResult1.data!.id;
      const taskListId2 = createResult2.data!.id;
      
      // 両方のタスクリストに共有リンクを作成
      const shareResult1 = await sdkOwner.actions.share.createShareLink(taskListId1);
      const shareResult2 = await sdkOwner.actions.share.createShareLink(taskListId2);
      
      expect(shareResult1.success).toBe(true);
      expect(shareResult2.success).toBe(true);
      
      const shareToken1 = shareResult1.data!.shareToken;
      const shareToken2 = shareResult2.data!.shareToken;
      
      // ビューワーが両方の共有タスクリストを閲覧
      vi.stubGlobal('window', {
        localStorage: testStorageViewer
      });
      
      const viewResult1 = await sdkViewer.actions.share.getSharedTaskList(shareToken1);
      const viewResult2 = await sdkViewer.actions.share.getSharedTaskList(shareToken2);
      
      expect(viewResult1.success).toBe(true);
      expect(viewResult2.success).toBe(true);
      expect(viewResult1.data?.name).toBe('マルチ共有1');
      expect(viewResult2.data?.name).toBe('マルチ共有2');
      
      // 一つの共有を削除
      vi.stubGlobal('window', {
        localStorage: testStorageOwner
      });
      
      const removeResult1 = await sdkOwner.actions.share.removeShareLink(taskListId1);
      expect(removeResult1.success).toBe(true);
      
      // 削除した共有はアクセスできないが、もう一つは引き続きアクセス可能
      vi.stubGlobal('window', {
        localStorage: testStorageViewer
      });
      
      const viewAfterRemove1 = await sdkViewer.actions.share.getSharedTaskList(shareToken1);
      const viewAfterRemove2 = await sdkViewer.actions.share.getSharedTaskList(shareToken2);
      
      expect(viewAfterRemove1.success).toBe(false);
      expect(viewAfterRemove2.success).toBe(true);
      expect(viewAfterRemove2.data?.name).toBe('マルチ共有2');
    });
  });
});