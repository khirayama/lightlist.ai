import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { 
  getTestRequest, 
  getTestPrisma, 
  generateAuthHeader,
  createAuthenticatedUser,
  generateUniqueTaskListName,
  generateUniqueTaskText,
  cleanupTestScenario
} from '../utils/test-helpers';
import { 
  cleanupTestDatabase, 
  teardownTestDatabase
} from '../setup';

describe('タスク管理フローシナリオ', () => {
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

  describe('基本的なタスク管理フロー', () => {
    it('完全なタスク管理ジャーニーを処理すること', async () => {
      // Step 1: 認証済みユーザーを作成
      const authUser = await createAuthenticatedUser({
        email: 'taskuser@example.com',
        password: 'TaskUser123',
      });

      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // Step 2: タスクリストを作成
      const taskListName = generateUniqueTaskListName('仕事用タスク');
      const createTaskListResponse = await request
        .post('/api/task-lists')
        .set(authHeaders)
        .send({
          name: taskListName,
        });

      expect(createTaskListResponse.status).toBe(201);
      const taskList = createTaskListResponse.body.data.taskList;
      expect(taskList.name).toBe(taskListName);

      // Step 3: タスクを追加（通常のタスク）
      const taskText1 = generateUniqueTaskText('会議資料作成');
      const createTaskResponse1 = await request
        .post(`/api/task-lists/${taskList.id}/tasks`)
        .set(authHeaders)
        .send({
          text: taskText1,
        });

      expect(createTaskResponse1.status).toBe(201);
      const task1 = createTaskResponse1.body.data.task;
      expect(task1.text).toBe(taskText1);
      expect(task1.completed).toBe(false);

      // Step 4: 日付付きタスクを追加（日付抽出機能をテスト）
      const taskText2 = '明日 プレゼンテーション準備';
      const createTaskResponse2 = await request
        .post(`/api/task-lists/${taskList.id}/tasks`)
        .set(authHeaders)
        .send({
          text: taskText2,
        });

      expect(createTaskResponse2.status).toBe(201);
      const task2 = createTaskResponse2.body.data.task;
      expect(task2.text).toBe('プレゼンテーション準備');
      expect(task2.date).toBeDefined();

      // Step 5: タスクリストを取得してタスクが正しく作成されていることを確認
      const getTasksResponse = await request
        .get(`/api/task-lists/${taskList.id}/tasks`)
        .set(authHeaders);

      expect(getTasksResponse.status).toBe(200);
      const tasks = getTasksResponse.body.data.tasks;
      expect(tasks).toHaveLength(2);

      // Step 6: タスクを完了にする
      const updateTaskResponse = await request
        .put(`/api/tasks/${task1.id}`)
        .set(authHeaders)
        .send({
          completed: true,
        });

      expect(updateTaskResponse.status).toBe(200);
      const updatedTask = updateTaskResponse.body.data.task;
      expect(updatedTask.completed).toBe(true);

      // Step 7: タスクを編集
      const editedText = 'プレゼンテーション準備（更新済み）';
      const editTaskResponse = await request
        .put(`/api/tasks/${task2.id}`)
        .set(authHeaders)
        .send({
          text: editedText,
        });

      expect(editTaskResponse.status).toBe(200);
      const editedTask = editTaskResponse.body.data.task;
      expect(editedTask.text).toBe(editedText);

      // Step 8: タスクを削除
      const deleteTaskResponse = await request
        .delete(`/api/tasks/${task1.id}`)
        .set(authHeaders);

      expect(deleteTaskResponse.status).toBe(200);

      // Step 9: タスクが削除されたことを確認
      const finalTasksResponse = await request
        .get(`/api/task-lists/${taskList.id}/tasks`)
        .set(authHeaders);

      expect(finalTasksResponse.status).toBe(200);
      const finalTasks = finalTasksResponse.body.data.tasks;
      expect(finalTasks).toHaveLength(1);
      expect(finalTasks[0].id).toBe(task2.id);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('複数のタスクリストで独立したタスク管理を処理すること', async () => {
      // 認証済みユーザーを作成
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // 複数のタスクリストを作成
      const taskList1Name = generateUniqueTaskListName('個人用');
      const taskList2Name = generateUniqueTaskListName('仕事用');

      const [taskList1Response, taskList2Response] = await Promise.all([
        request.post('/api/task-lists').set(authHeaders).send({ name: taskList1Name }),
        request.post('/api/task-lists').set(authHeaders).send({ name: taskList2Name }),
      ]);

      expect(taskList1Response.status).toBe(201);
      expect(taskList2Response.status).toBe(201);

      const taskList1 = taskList1Response.body.data.taskList;
      const taskList2 = taskList2Response.body.data.taskList;

      // 各タスクリストにタスクを追加
      const task1Text = generateUniqueTaskText('個人タスク');
      const task2Text = generateUniqueTaskText('仕事タスク');

      const [task1Response, task2Response] = await Promise.all([
        request.post(`/api/task-lists/${taskList1.id}/tasks`).set(authHeaders).send({ text: task1Text }),
        request.post(`/api/task-lists/${taskList2.id}/tasks`).set(authHeaders).send({ text: task2Text }),
      ]);

      expect(task1Response.status).toBe(201);
      expect(task2Response.status).toBe(201);

      // 各タスクリストからタスクを取得
      const [tasks1Response, tasks2Response] = await Promise.all([
        request.get(`/api/task-lists/${taskList1.id}/tasks`).set(authHeaders),
        request.get(`/api/task-lists/${taskList2.id}/tasks`).set(authHeaders),
      ]);

      expect(tasks1Response.status).toBe(200);
      expect(tasks2Response.status).toBe(200);

      const tasks1 = tasks1Response.body.data.tasks;
      const tasks2 = tasks2Response.body.data.tasks;

      expect(tasks1).toHaveLength(1);
      expect(tasks2).toHaveLength(1);
      expect(tasks1[0].text).toBe(task1Text);
      expect(tasks2[0].text).toBe(task2Text);

      // タスクが正しいタスクリストに属していることを確認
      expect(tasks1[0].taskListId).toBe(taskList1.id);
      expect(tasks2[0].taskListId).toBe(taskList2.id);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('日付抽出機能', () => {
    it('様々な日付表現を正しく抽出すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // タスクリストを作成
      const taskListResponse = await request
        .post('/api/task-lists')
        .set(authHeaders)
        .send({ name: generateUniqueTaskListName('日付テスト') });

      const taskList = taskListResponse.body.data.taskList;

      // 様々な日付表現をテスト
      const dateTestCases = [
        { input: '今日 買い物', expectedText: '買い物', shouldHaveDate: true },
        { input: '明日 会議', expectedText: '会議', shouldHaveDate: true },
        { input: '2025/06/25 締切', expectedText: '締切', shouldHaveDate: true },
        { input: '普通のタスク', expectedText: '普通のタスク', shouldHaveDate: false },
        { input: 'today buy groceries', expectedText: 'buy groceries', shouldHaveDate: true },
        { input: 'tomorrow meeting', expectedText: 'meeting', shouldHaveDate: true },
      ];

      for (const testCase of dateTestCases) {
        const createTaskResponse = await request
          .post(`/api/task-lists/${taskList.id}/tasks`)
          .set(authHeaders)
          .send({ text: testCase.input });

        expect(createTaskResponse.status).toBe(201);
        const task = createTaskResponse.body.data.task;
        expect(task.text).toBe(testCase.expectedText);

        if (testCase.shouldHaveDate) {
          expect(task.date).toBeDefined();
          expect(task.date).not.toBeNull();
        } else {
          expect(task.date).toBeNull();
        }
      }

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('タスクリスト設定管理', () => {
    it('タスクリストの背景色を設定・更新すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // タスクリストを作成
      const taskListResponse = await request
        .post('/api/task-lists')
        .set(authHeaders)
        .send({ name: generateUniqueTaskListName('カラーテスト') });

      const taskList = taskListResponse.body.data.taskList;
      expect(taskList.background).toBe('');

      // 背景色を設定
      const updateColorResponse = await request
        .put(`/api/task-lists/${taskList.id}`)
        .set(authHeaders)
        .send({ background: '#FFE4E1' });

      expect(updateColorResponse.status).toBe(200);
      const updatedTaskList = updateColorResponse.body.data.taskList;
      expect(updatedTaskList.background).toBe('#FFE4E1');

      // 背景色を変更
      const changeColorResponse = await request
        .put(`/api/task-lists/${taskList.id}`)
        .set(authHeaders)
        .send({ background: '#E6E6FA' });

      expect(changeColorResponse.status).toBe(200);
      const reUpdatedTaskList = changeColorResponse.body.data.taskList;
      expect(reUpdatedTaskList.background).toBe('#E6E6FA');

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('タスクリストの順序を管理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // 複数のタスクリストを作成
      const taskListNames = ['リスト1', 'リスト2', 'リスト3'].map(generateUniqueTaskListName);
      const taskListIds = [];

      for (const name of taskListNames) {
        const response = await request
          .post('/api/task-lists')
          .set(authHeaders)
          .send({ name });

        expect(response.status).toBe(201);
        taskListIds.push(response.body.data.taskList.id);
      }

      // 現在の順序を確認
      const appResponse = await request
        .get(`/api/users/${authUser.user.id}/app`)
        .set(authHeaders);

      expect(appResponse.status).toBe(200);
      const currentOrder = appResponse.body.data.app.taskListOrder;
      expect(currentOrder).toEqual(taskListIds);

      // 順序を変更
      const newOrder = [taskListIds[2], taskListIds[0], taskListIds[1]];
      const updateOrderResponse = await request
        .put(`/api/users/${authUser.user.id}/task-lists/order`)
        .set(authHeaders)
        .send({ taskListIds: newOrder });

      expect(updateOrderResponse.status).toBe(200);
      expect(updateOrderResponse.body.data.taskListOrder).toEqual(newOrder);

      // 変更後の順序を確認
      const updatedAppResponse = await request
        .get(`/api/users/${authUser.user.id}/app`)
        .set(authHeaders);

      expect(updatedAppResponse.status).toBe(200);
      const updatedOrder = updatedAppResponse.body.data.app.taskListOrder;
      expect(updatedOrder).toEqual(newOrder);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('ユーザー設定との連携', () => {
    it('タスク挿入位置設定を反映すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // タスクリストを作成
      const taskListResponse = await request
        .post('/api/task-lists')
        .set(authHeaders)
        .send({ name: generateUniqueTaskListName('挿入位置テスト') });

      const taskList = taskListResponse.body.data.taskList;

      // デフォルト設定（top）でタスクを追加
      const task1Response = await request
        .post(`/api/task-lists/${taskList.id}/tasks`)
        .set(authHeaders)
        .send({ text: 'First Task' });

      expect(task1Response.status).toBe(201);

      // 設定をbottomに変更
      const updateSettingsResponse = await request
        .put(`/api/users/${authUser.user.id}/app`)
        .set(authHeaders)
        .send({ taskInsertPosition: 'bottom' });

      expect(updateSettingsResponse.status).toBe(200);

      // 別のタスクを追加
      const task2Response = await request
        .post(`/api/task-lists/${taskList.id}/tasks`)
        .set(authHeaders)
        .send({ text: 'Second Task' });

      expect(task2Response.status).toBe(201);

      // タスクの順序を確認（実際の挿入位置は設定に依存）
      const tasksResponse = await request
        .get(`/api/task-lists/${taskList.id}/tasks`)
        .set(authHeaders);

      expect(tasksResponse.status).toBe(200);
      const tasks = tasksResponse.body.data.tasks;
      expect(tasks).toHaveLength(2);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないタスクリストにアクセスした場合のエラーを処理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      const nonExistentTaskListId = 'cmbz060iw0000ki5g9h2hwg8n';

      // 存在しないタスクリストのタスクを取得
      const getTasksResponse = await request
        .get(`/api/task-lists/${nonExistentTaskListId}/tasks`)
        .set(authHeaders);

      expect(getTasksResponse.status).toBe(403);

      // 存在しないタスクリストにタスクを追加
      const createTaskResponse = await request
        .post(`/api/task-lists/${nonExistentTaskListId}/tasks`)
        .set(authHeaders)
        .send({ text: 'Test Task' });

      expect(createTaskResponse.status).toBe(403);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('存在しないタスクを更新・削除した場合のエラーを処理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      const nonExistentTaskId = 'cmbz060iw0000ki5g9h2hwg8n';

      // 存在しないタスクを更新
      const updateTaskResponse = await request
        .put(`/api/tasks/${nonExistentTaskId}`)
        .set(authHeaders)
        .send({ text: 'Updated Task' });

      expect(updateTaskResponse.status).toBe(404);

      // 存在しないタスクを削除
      const deleteTaskResponse = await request
        .delete(`/api/tasks/${nonExistentTaskId}`)
        .set(authHeaders);

      expect(deleteTaskResponse.status).toBe(404);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('無効なデータでタスクを作成した場合のバリデーションエラーを処理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // タスクリストを作成
      const taskListResponse = await request
        .post('/api/task-lists')
        .set(authHeaders)
        .send({ name: generateUniqueTaskListName('バリデーションテスト') });

      const taskList = taskListResponse.body.data.taskList;

      // 空のタスクテキストで作成
      const emptyTaskResponse = await request
        .post(`/api/task-lists/${taskList.id}/tasks`)
        .set(authHeaders)
        .send({ text: '' });

      expect(emptyTaskResponse.status).toBe(400);
      expect(emptyTaskResponse.body.error).toBe('Validation failed');

      // 非常に長いタスクテキストで作成
      const longText = 'a'.repeat(1001);
      const longTaskResponse = await request
        .post(`/api/task-lists/${taskList.id}/tasks`)
        .set(authHeaders)
        .send({ text: longText });

      expect(longTaskResponse.status).toBe(400);
      expect(longTaskResponse.body.error).toBe('Validation failed');

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('権限管理', () => {
    it('他のユーザーのタスクリストにアクセスできないこと', async () => {
      // 2人のユーザーを作成
      const user1 = await createAuthenticatedUser({ email: 'user1@example.com' });
      const user2 = await createAuthenticatedUser({ email: 'user2@example.com' });

      const user1Headers = generateAuthHeader(user1.tokens.token);
      const user2Headers = generateAuthHeader(user2.tokens.token);

      // User1がタスクリストを作成
      const taskListResponse = await request
        .post('/api/task-lists')
        .set(user1Headers)
        .send({ name: generateUniqueTaskListName('User1のリスト') });

      expect(taskListResponse.status).toBe(201);
      const taskList = taskListResponse.body.data.taskList;

      // User1がタスクを追加
      const taskResponse = await request
        .post(`/api/task-lists/${taskList.id}/tasks`)
        .set(user1Headers)
        .send({ text: 'User1のタスク' });

      expect(taskResponse.status).toBe(201);
      const task = taskResponse.body.data.task;

      // User2がUser1のタスクリストにアクセス（失敗すべき）
      const accessTaskListResponse = await request
        .get(`/api/task-lists/${taskList.id}/tasks`)
        .set(user2Headers);

      expect(accessTaskListResponse.status).toBe(403);

      // User2がUser1のタスクを更新（失敗すべき）
      const updateTaskResponse = await request
        .put(`/api/tasks/${task.id}`)
        .set(user2Headers)
        .send({ text: 'User2による更新' });

      expect(updateTaskResponse.status).toBe(404); // Task not found for this user

      // User2がUser1のタスクを削除（失敗すべき）
      const deleteTaskResponse = await request
        .delete(`/api/tasks/${task.id}`)
        .set(user2Headers);

      expect(deleteTaskResponse.status).toBe(404);

      // Cleanup
      await cleanupTestScenario(user1.user.id);
      await cleanupTestScenario(user2.user.id);
    });
  });
});