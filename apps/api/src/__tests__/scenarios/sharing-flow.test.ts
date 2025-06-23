import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { 
  getTestRequest, 
  getTestPrisma, 
  generateAuthHeader,
  createAuthenticatedUser,
  createCompleteUserScenario,
  generateUniqueTaskListName,
  generateUniqueTaskText,
  cleanupTestScenario
} from '../utils/test-helpers';
import { 
  cleanupTestDatabase, 
  teardownTestDatabase
} from '../setup';

describe('共有機能フローシナリオ', () => {
  const request = getTestRequest();
  const prisma = getTestPrisma();

  // Cleanup before each test
  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  // Global teardown
  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('基本的な共有フロー', () => {
    it('完全な共有フローを処理すること', async () => {
      // Step 1: 完全なユーザーシナリオを作成（ユーザー + タスクリスト + タスク）
      const scenario = await createCompleteUserScenario({
        email: 'shareuser@example.com',
        password: 'ShareUser123',
        taskListName: '共有テストリスト',
        taskTexts: ['共有タスク1', '共有タスク2', '今日 期限付きタスク'],
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // Step 2: タスクリストの共有リンクを生成
      const createShareResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/share`)
        .set(authHeaders)
        .send({});

      expect(createShareResponse.status).toBe(201);
      const shareData = createShareResponse.body.data;
      expect(shareData.shareUrl).toBeDefined();
      expect(shareData.shareToken).toBeDefined();
      expect(shareData.shareUrl).toContain(shareData.shareToken);

      // Step 3: 共有リンクでタスクリストにアクセス（認証不要）
      const sharedTaskListResponse = await request
        .get(`/api/share/${shareData.shareToken}`);

      expect(sharedTaskListResponse.status).toBe(200);
      const sharedTaskList = sharedTaskListResponse.body.data.taskList;
      
      expect(sharedTaskList.id).toBe(scenario.taskList.id);
      expect(sharedTaskList.name).toBe(scenario.taskList.name);
      expect(sharedTaskList.tasks).toHaveLength(3);
      
      // タスクの内容を確認
      const taskTexts = sharedTaskList.tasks.map((task: any) => task.text);
      expect(taskTexts).toContain('共有タスク1');
      expect(taskTexts).toContain('共有タスク2');
      expect(taskTexts).toContain('期限付きタスク');

      // 日付抽出されたタスクを確認
      const dateTask = sharedTaskList.tasks.find((task: any) => task.text === '期限付きタスク');
      expect(dateTask.date).toBeDefined();

      // Step 4: 共有リンクを削除
      const deleteShareResponse = await request
        .delete(`/api/task-lists/${scenario.taskList.id}/share`)
        .set(authHeaders);

      expect(deleteShareResponse.status).toBe(200);

      // Step 5: 削除後に共有リンクでアクセス（失敗すべき）
      const accessAfterDeleteResponse = await request
        .get(`/api/share/${shareData.shareToken}`);

      expect(accessAfterDeleteResponse.status).toBe(404);

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('複数の共有リンクを管理すること', async () => {
      // 2人のユーザーを作成
      const user1Scenario = await createCompleteUserScenario({
        email: 'user1@example.com',
        taskListName: 'User1のリスト',
        taskTexts: ['User1のタスク'],
      });

      const user2Scenario = await createCompleteUserScenario({
        email: 'user2@example.com',
        taskListName: 'User2のリスト',
        taskTexts: ['User2のタスク'],
      });

      const user1Headers = generateAuthHeader(user1Scenario.tokens.token);
      const user2Headers = generateAuthHeader(user2Scenario.tokens.token);

      // 両ユーザーが自分のタスクリストを共有
      const [share1Response, share2Response] = await Promise.all([
        request.post(`/api/task-lists/${user1Scenario.taskList.id}/share`).set(user1Headers).send({}),
        request.post(`/api/task-lists/${user2Scenario.taskList.id}/share`).set(user2Headers).send({}),
      ]);

      expect(share1Response.status).toBe(201);
      expect(share2Response.status).toBe(201);

      const share1Token = share1Response.body.data.shareToken;
      const share2Token = share2Response.body.data.shareToken;

      // 異なる共有トークンが生成されることを確認
      expect(share1Token).not.toBe(share2Token);

      // 各共有リンクで正しいタスクリストにアクセスできることを確認
      const [shared1Response, shared2Response] = await Promise.all([
        request.get(`/api/share/${share1Token}`),
        request.get(`/api/share/${share2Token}`),
      ]);

      expect(shared1Response.status).toBe(200);
      expect(shared2Response.status).toBe(200);

      const shared1TaskList = shared1Response.body.data.taskList;
      const shared2TaskList = shared2Response.body.data.taskList;

      expect(shared1TaskList.name).toBe('User1のリスト');
      expect(shared2TaskList.name).toBe('User2のリスト');
      expect(shared1TaskList.tasks[0].text).toBe('User1のタスク');
      expect(shared2TaskList.tasks[0].text).toBe('User2のタスク');

      // Cleanup
      await cleanupTestScenario(user1Scenario.user.id);
      await cleanupTestScenario(user2Scenario.user.id);
    });
  });

  describe('共有権限のテスト', () => {
    it('読み取り専用であることを確認すること', async () => {
      // タスクリストとタスクを作成
      const scenario = await createCompleteUserScenario({
        taskListName: '読み取り専用テスト',
        taskTexts: ['元のタスク'],
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 共有リンクを生成
      const shareResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/share`)
        .set(authHeaders)
        .send({});

      expect(shareResponse.status).toBe(201);
      const shareToken = shareResponse.body.data.shareToken;

      // 共有リンクでアクセス
      const sharedTaskListResponse = await request
        .get(`/api/share/${shareToken}`);

      expect(sharedTaskListResponse.status).toBe(200);
      const sharedTaskList = sharedTaskListResponse.body.data.taskList;

      // 共有リンクには完全なタスクリスト情報が含まれている
      expect(sharedTaskList.id).toBe(scenario.taskList.id);
      expect(sharedTaskList.name).toBe(scenario.taskList.name);
      expect(sharedTaskList.background).toBeDefined();
      expect(sharedTaskList.tasks).toHaveLength(1);
      expect(sharedTaskList.tasks[0].text).toBe('元のタスク');

      // 注意: 共有リンクは読み取り専用なので、他のAPIエンドポイント経由での編集はできません
      // （共有リンクそのものは GET /api/share/:token のみで、編集機能はありません）

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('所有者のみが共有リンクを管理できること', async () => {
      // タスクリストを作成
      const ownerScenario = await createCompleteUserScenario({
        email: 'owner@example.com',
        taskListName: '所有者のリスト',
      });

      // 別のユーザーを作成
      const otherUser = await createAuthenticatedUser({
        email: 'other@example.com',
      });

      const ownerHeaders = generateAuthHeader(ownerScenario.tokens.token);
      const otherHeaders = generateAuthHeader(otherUser.tokens.token);

      // 所有者が共有リンクを作成（成功すべき）
      const createShareResponse = await request
        .post(`/api/task-lists/${ownerScenario.taskList.id}/share`)
        .set(ownerHeaders)
        .send({});

      expect(createShareResponse.status).toBe(201);

      // 他のユーザーが同じタスクリストに共有リンクを作成しようとする（失敗すべき）
      const unauthorizedCreateResponse = await request
        .post(`/api/task-lists/${ownerScenario.taskList.id}/share`)
        .set(otherHeaders)
        .send({});

      expect(unauthorizedCreateResponse.status).toBe(404);

      // 他のユーザーが共有リンクを削除しようとする（失敗すべき）
      const unauthorizedDeleteResponse = await request
        .delete(`/api/task-lists/${ownerScenario.taskList.id}/share`)
        .set(otherHeaders);

      expect(unauthorizedDeleteResponse.status).toBe(404);

      // 所有者が共有リンクを削除（成功すべき）
      const deleteShareResponse = await request
        .delete(`/api/task-lists/${ownerScenario.taskList.id}/share`)
        .set(ownerHeaders);

      expect(deleteShareResponse.status).toBe(200);

      // Cleanup
      await cleanupTestScenario(ownerScenario.user.id);
      await cleanupTestScenario(otherUser.user.id);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しない共有トークンでのアクセスを処理すること', async () => {
      const nonExistentToken = 'non-existent-token-12345';

      const response = await request
        .get(`/api/share/${nonExistentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Shared task list not found');
    });

    it('無効な共有トークンフォーマットを処理すること', async () => {
      const invalidTokens = ['', ' ', '   ', 'short', '!@#$%^&*()'];

      for (const invalidToken of invalidTokens) {
        const response = await request
          .get(`/api/share/${encodeURIComponent(invalidToken)}`);

        expect(response.status).toBe(404);
      }
    });

    it('存在しないタスクリストの共有を処理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      const nonExistentTaskListId = 'cmbz060iw0000ki5g9h2hwg8n';

      // 存在しないタスクリストの共有リンク作成
      const createShareResponse = await request
        .post(`/api/task-lists/${nonExistentTaskListId}/share`)
        .set(authHeaders)
        .send({});

      expect(createShareResponse.status).toBe(404); // Task list not found

      // 存在しないタスクリストの共有リンク削除
      const deleteShareResponse = await request
        .delete(`/api/task-lists/${nonExistentTaskListId}/share`)
        .set(authHeaders);

      expect(deleteShareResponse.status).toBe(404); // Task list not found

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('重複する共有リンク作成を処理すること', async () => {
      const scenario = await createCompleteUserScenario({
        taskListName: '重複テスト',
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 最初の共有リンク作成（成功すべき）
      const firstShareResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/share`)
        .set(authHeaders)
        .send({});

      expect(firstShareResponse.status).toBe(201);

      // 2回目の共有リンク作成（既存の共有リンクがある場合）
      const secondShareResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/share`)
        .set(authHeaders)
        .send({});

      expect(secondShareResponse.status).toBe(400);
      expect(secondShareResponse.body.error).toBe('Share link already exists for this task list');

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('存在しない共有リンクの削除を処理すること', async () => {
      const scenario = await createCompleteUserScenario({
        taskListName: '削除テスト',
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 共有リンクを作成せずに削除を試行
      const deleteResponse = await request
        .delete(`/api/task-lists/${scenario.taskList.id}/share`)
        .set(authHeaders);

      expect(deleteResponse.status).toBe(404);
      expect(deleteResponse.body.error).toBe('Share link not found for this task list');

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });
  });

  describe('セキュリティテスト', () => {
    it('共有トークンがランダムで推測困難であること', async () => {
      const scenario = await createCompleteUserScenario({
        taskListName: 'セキュリティテスト',
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 複数の共有トークンを生成して比較
      const tokens = [];
      
      for (let i = 0; i < 5; i++) {
        // 共有リンク作成
        const shareResponse = await request
          .post(`/api/task-lists/${scenario.taskList.id}/share`)
          .set(authHeaders)
          .send({});

        expect(shareResponse.status).toBe(201);
        tokens.push(shareResponse.body.data.shareToken);

        // 共有リンク削除（次のテストのため）
        await request
          .delete(`/api/task-lists/${scenario.taskList.id}/share`)
          .set(authHeaders);
      }

      // 全てのトークンが異なることを確認
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // トークンが十分な長さを持つことを確認
      for (const token of tokens) {
        expect(token.length).toBeGreaterThan(10);
        expect(typeof token).toBe('string');
      }

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('非アクティブな共有リンクへのアクセスを防ぐこと', async () => {
      const scenario = await createCompleteUserScenario({
        taskListName: '非アクティブテスト',
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 共有リンクを作成
      const shareResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/share`)
        .set(authHeaders)
        .send({});

      expect(shareResponse.status).toBe(201);
      const shareToken = shareResponse.body.data.shareToken;

      // 共有リンクが有効であることを確認
      const accessResponse = await request
        .get(`/api/share/${shareToken}`);

      expect(accessResponse.status).toBe(200);

      // データベースで直接共有リンクを非アクティブにする
      await prisma.taskListShare.updateMany({
        where: { shareToken },
        data: { isActive: false },
      });

      // 非アクティブな共有リンクへのアクセス（失敗すべき）
      const inactiveAccessResponse = await request
        .get(`/api/share/${shareToken}`);

      expect(inactiveAccessResponse.status).toBe(404);

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のタスクを含む共有リストを効率的に処理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // タスクリストを作成
      const taskListResponse = await request
        .post('/api/task-lists')
        .set(authHeaders)
        .send({ name: generateUniqueTaskListName('大量タスクテスト') });

      const taskList = taskListResponse.body.data.taskList;

      // 大量のタスクを作成（50個）
      const taskPromises = [];
      for (let i = 0; i < 50; i++) {
        taskPromises.push(
          request
            .post(`/api/task-lists/${taskList.id}/tasks`)
            .set(authHeaders)
            .send({ text: generateUniqueTaskText(`大量タスク${i + 1}`) })
        );
      }

      await Promise.all(taskPromises);

      // 共有リンクを作成
      const shareResponse = await request
        .post(`/api/task-lists/${taskList.id}/share`)
        .set(authHeaders)
        .send({});

      expect(shareResponse.status).toBe(201);
      const shareToken = shareResponse.body.data.shareToken;

      // 共有リンクでアクセス（パフォーマンス測定）
      const startTime = Date.now();
      const sharedResponse = await request
        .get(`/api/share/${shareToken}`);
      const endTime = Date.now();

      expect(sharedResponse.status).toBe(200);
      const sharedTaskList = sharedResponse.body.data.taskList;
      expect(sharedTaskList.tasks).toHaveLength(50);

      // レスポンス時間が合理的であることを確認（5秒未満）
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(5000);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });
});