import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import * as Y from 'yjs';
import { 
  getTestRequest, 
  getTestPrisma, 
  generateAuthHeader,
  createAuthenticatedUser,
  createCompleteUserScenario,
  createTestCollaborativeDoc,
  cleanupTestScenario
} from '../utils/test-helpers';
import { 
  cleanupTestDatabase, 
  teardownTestDatabase
} from '../setup';
import {
  encodeYjsState,
  encodeYjsStateVector,
  decodeYjsState,
  generateYjsUpdate,
  applyYjsUpdate,
  createInitialTaskListDoc,
  addTaskToDoc,
  removeTaskFromDoc,
  getTaskOrderFromDoc,
} from '../../utils/yjs';

describe('共同編集フローシナリオ', () => {
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

  describe('基本的な共同編集フロー', () => {
    it('完全な共同編集初期化フローを処理すること', async () => {
      // Step 1: タスクリストとタスクを持つユーザーシナリオを作成
      const scenario = await createCompleteUserScenario({
        email: 'collab@example.com',
        password: 'Collab123',
        taskListName: '共同編集テスト',
        taskTexts: ['既存タスク1', '既存タスク2', '既存タスク3'],
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // Step 2: 共同編集を初期化
      const initializeResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/initialize`)
        .set(authHeaders)
        .send({});

      expect(initializeResponse.status).toBe(200);
      const initData = initializeResponse.body.data;
      expect(initData.state).toBeDefined();
      expect(initData.stateVector).toBeDefined();
      expect(typeof initData.state).toBe('string');
      expect(typeof initData.stateVector).toBe('string');

      // Step 3: 完全な状態を取得
      const fullStateResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/collaborative/full-state`)
        .set(authHeaders);

      expect(fullStateResponse.status).toBe(200);
      const fullStateData = fullStateResponse.body.data;
      expect(fullStateData.state).toBeDefined();
      expect(fullStateData.stateVector).toBeDefined();

      // Step 4: Yjsドキュメントをデコードして内容を確認
      const doc = decodeYjsState(fullStateData.state);
      const taskOrder = getTaskOrderFromDoc(doc);
      expect(taskOrder).toHaveLength(3);

      // 既存のタスクIDが含まれていることを確認
      const existingTaskIds = scenario.tasks.map(task => task.id);
      for (const taskId of taskOrder) {
        expect(existingTaskIds).toContain(taskId);
      }

      // Step 5: 同期テスト（空の更新）
      const syncResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/sync`)
        .set(authHeaders)
        .send({
          stateVector: fullStateData.stateVector,
        });

      expect(syncResponse.status).toBe(200);
      const syncData = syncResponse.body.data;
      expect(syncData.update).toBeNull(); // 差分なしのため null
      expect(syncData.stateVector).toBeDefined();

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('Yjsドキュメントの操作を正しく処理すること', async () => {
      const scenario = await createCompleteUserScenario({
        taskListName: 'Yjs操作テスト',
        taskTexts: ['初期タスク'],
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 共同編集を初期化
      await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/initialize`)
        .set(authHeaders)
        .send({});

      // 完全な状態を取得
      const fullStateResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/collaborative/full-state`)
        .set(authHeaders);

      const initialDoc = decodeYjsState(fullStateResponse.body.data.state);
      const initialStateVector = fullStateResponse.body.data.stateVector;

      // クライアント側でタスクを追加するシミュレーション
      const clientDoc = decodeYjsState(fullStateResponse.body.data.state);
      
      // 新しいタスクIDを追加（実際のタスクは別途APIで作成）
      const newTaskId = 'new-task-id-12345';
      addTaskToDoc(clientDoc, newTaskId, 'bottom');

      // クライアントの変更をサーバーに同期
      const clientStateVector = encodeYjsStateVector(clientDoc);
      const update = generateYjsUpdate(clientDoc, initialStateVector);

      expect(update).not.toBeNull();

      const syncResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/sync`)
        .set(authHeaders)
        .send({
          stateVector: initialStateVector,
          update: update,
        });

      expect(syncResponse.status).toBe(200);

      // 更新後の状態を取得して確認
      const updatedStateResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/collaborative/full-state`)
        .set(authHeaders);

      const updatedDoc = decodeYjsState(updatedStateResponse.body.data.state);
      const updatedTaskOrder = getTaskOrderFromDoc(updatedDoc);

      expect(updatedTaskOrder).toHaveLength(2);
      expect(updatedTaskOrder).toContain(newTaskId);

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });
  });

  describe('Yjs機能のテスト', () => {
    it('Yjsユーティリティ関数が正しく動作すること', async () => {
      // 初期ドキュメントを作成
      const doc = createInitialTaskListDoc();
      
      // タスクを追加
      const taskIds = ['task-1', 'task-2', 'task-3'];
      for (const taskId of taskIds) {
        addTaskToDoc(doc, taskId, 'bottom');
      }

      // タスクの順序を確認
      let taskOrder = getTaskOrderFromDoc(doc);
      expect(taskOrder).toEqual(taskIds);

      // タスクを削除
      const removed = removeTaskFromDoc(doc, 'task-2');
      expect(removed).toBe(true);

      taskOrder = getTaskOrderFromDoc(doc);
      expect(taskOrder).toEqual(['task-1', 'task-3']);

      // 存在しないタスクの削除
      const notRemoved = removeTaskFromDoc(doc, 'non-existent');
      expect(notRemoved).toBe(false);

      // エンコード/デコードのテスト
      const encodedState = encodeYjsState(doc);
      const encodedStateVector = encodeYjsStateVector(doc);

      expect(typeof encodedState).toBe('string');
      expect(typeof encodedStateVector).toBe('string');

      // デコードして内容が保持されていることを確認
      const decodedDoc = decodeYjsState(encodedState);
      const decodedTaskOrder = getTaskOrderFromDoc(decodedDoc);
      expect(decodedTaskOrder).toEqual(['task-1', 'task-3']);
    });

    it('Yjs差分更新が正しく動作すること', async () => {
      // 2つの独立したドキュメントを作成
      const doc1 = createInitialTaskListDoc();
      const doc2 = createInitialTaskListDoc();

      // doc1にタスクを追加
      addTaskToDoc(doc1, 'task-from-doc1', 'bottom');

      // doc2の状態ベクターを取得
      const doc2StateVector = encodeYjsStateVector(doc2);

      // doc1の変更を doc2StateVector 基準で差分として取得
      const update = generateYjsUpdate(doc1, doc2StateVector);
      expect(update).not.toBeNull();

      // doc2に差分を適用
      if (update) {
        applyYjsUpdate(doc2, update);
      }

      // 両方のドキュメントが同じ状態になることを確認
      const doc1TaskOrder = getTaskOrderFromDoc(doc1);
      const doc2TaskOrder = getTaskOrderFromDoc(doc2);
      expect(doc1TaskOrder).toEqual(doc2TaskOrder);
      expect(doc1TaskOrder).toContain('task-from-doc1');
    });
  });

  describe('権限管理', () => {
    it('タスクリストの所有者のみがアクセスできること', async () => {
      // 所有者のシナリオを作成
      const ownerScenario = await createCompleteUserScenario({
        email: 'owner@example.com',
        taskListName: '所有者のリスト',
      });

      // 他のユーザーを作成
      const otherUser = await createAuthenticatedUser({
        email: 'other@example.com',
      });

      const ownerHeaders = generateAuthHeader(ownerScenario.tokens.token);
      const otherHeaders = generateAuthHeader(otherUser.tokens.token);

      // 所有者が共同編集を初期化（成功すべき）
      const initializeResponse = await request
        .post(`/api/task-lists/${ownerScenario.taskList.id}/collaborative/initialize`)
        .set(ownerHeaders)
        .send({});

      expect(initializeResponse.status).toBe(200);

      // 他のユーザーが状態を取得しようとする（失敗すべき）
      const unauthorizedStateResponse = await request
        .get(`/api/task-lists/${ownerScenario.taskList.id}/collaborative/full-state`)
        .set(otherHeaders);

      expect(unauthorizedStateResponse.status).toBe(403);

      // 他のユーザーが同期しようとする（失敗すべき）
      const unauthorizedSyncResponse = await request
        .post(`/api/task-lists/${ownerScenario.taskList.id}/collaborative/sync`)
        .set(otherHeaders)
        .send({
          stateVector: 'dummy-state-vector',
        });

      expect(unauthorizedSyncResponse.status).toBe(403);

      // Cleanup
      await cleanupTestScenario(ownerScenario.user.id);
      await cleanupTestScenario(otherUser.user.id);
    });
  });

  describe('エラーハンドリング', () => {
    it('重複する初期化を防ぐこと', async () => {
      const scenario = await createCompleteUserScenario({
        taskListName: '重複初期化テスト',
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 最初の初期化（成功すべき）
      const firstInitResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/initialize`)
        .set(authHeaders)
        .send({});

      expect(firstInitResponse.status).toBe(200);

      // 2回目の初期化（失敗すべき）
      const secondInitResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/initialize`)
        .set(authHeaders)
        .send({});

      expect(secondInitResponse.status).toBe(400);
      expect(secondInitResponse.body.error).toBe('Collaborative editing is already enabled for this task list');

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('共同編集が無効な場合のエラーを処理すること', async () => {
      const scenario = await createCompleteUserScenario({
        taskListName: '無効状態テスト',
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 初期化せずに状態を取得（失敗すべき）
      const stateResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/collaborative/full-state`)
        .set(authHeaders);

      expect(stateResponse.status).toBe(404);
      expect(stateResponse.body.error).toBe('Collaborative editing is not enabled for this task list');

      // 初期化せずに同期（失敗すべき）
      const syncResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/sync`)
        .set(authHeaders)
        .send({
          stateVector: 'dummy-state-vector',
        });

      expect(syncResponse.status).toBe(404);
      expect(syncResponse.body.error).toBe('Collaborative editing is not enabled for this task list');

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('無効なデータでの同期エラーを処理すること', async () => {
      const scenario = await createCompleteUserScenario({
        taskListName: '無効データテスト',
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 共同編集を初期化
      await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/initialize`)
        .set(authHeaders)
        .send({});

      // 無効なstateVectorで同期
      const invalidStateVectorResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/sync`)
        .set(authHeaders)
        .send({
          stateVector: '', // 空の状態ベクター
        });

      expect(invalidStateVectorResponse.status).toBe(400);
      expect(invalidStateVectorResponse.body.error).toBe('Validation failed');

      // 無効なupdateで同期
      const invalidUpdateResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/sync`)
        .set(authHeaders)
        .send({
          stateVector: 'dGVzdA==', // 有効なBase64だが無効なYjsデータ
          update: 'invalid-update-data',
        });

      expect(invalidUpdateResponse.status).toBe(400);
      expect(invalidUpdateResponse.body.error).toBe('Invalid update data');

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('存在しないタスクリストでの共同編集操作を処理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      const nonExistentTaskListId = 'cmbz060iw0000ki5g9h2hwg8n';

      // 存在しないタスクリストの初期化
      const initResponse = await request
        .post(`/api/task-lists/${nonExistentTaskListId}/collaborative/initialize`)
        .set(authHeaders)
        .send({});

      expect(initResponse.status).toBe(403); // Access denied

      // 存在しないタスクリストの状態取得
      const stateResponse = await request
        .get(`/api/task-lists/${nonExistentTaskListId}/collaborative/full-state`)
        .set(authHeaders);

      expect(stateResponse.status).toBe(403); // Access denied

      // 存在しないタスクリストの同期
      const syncResponse = await request
        .post(`/api/task-lists/${nonExistentTaskListId}/collaborative/sync`)
        .set(authHeaders)
        .send({
          stateVector: 'dGVzdA==',
        });

      expect(syncResponse.status).toBe(403); // Access denied

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('同期処理のシミュレーション', () => {
    it('複数クライアントの同期シナリオをシミュレートすること', async () => {
      const scenario = await createCompleteUserScenario({
        taskListName: '複数クライアント同期テスト',
        taskTexts: ['共通タスク'],
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 共同編集を初期化
      await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/initialize`)
        .set(authHeaders)
        .send({});

      // クライアント1: 初期状態を取得
      const client1InitialResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/collaborative/full-state`)
        .set(authHeaders);

      const client1InitialState = client1InitialResponse.body.data;

      // クライアント2: 初期状態を取得
      const client2InitialResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/collaborative/full-state`)
        .set(authHeaders);

      const client2InitialState = client2InitialResponse.body.data;

      // 両クライアントが同じ初期状態を持つことを確認
      expect(client1InitialState.state).toBe(client2InitialState.state);

      // クライアント1が変更を行う
      const client1Doc = decodeYjsState(client1InitialState.state);
      addTaskToDoc(client1Doc, 'task-from-client1', 'bottom');

      const client1Update = generateYjsUpdate(client1Doc, client1InitialState.stateVector);

      // クライアント1の変更をサーバーに同期
      const client1SyncResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/sync`)
        .set(authHeaders)
        .send({
          stateVector: client1InitialState.stateVector,
          update: client1Update,
        });

      expect(client1SyncResponse.status).toBe(200);

      // クライアント2が差分を取得
      const client2SyncResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/sync`)
        .set(authHeaders)
        .send({
          stateVector: client2InitialState.stateVector,
        });

      expect(client2SyncResponse.status).toBe(200);
      const client2Update = client2SyncResponse.body.data.update;

      // クライアント2が差分を適用
      const client2Doc = decodeYjsState(client2InitialState.state);
      if (client2Update) {
        applyYjsUpdate(client2Doc, client2Update);
      }

      // 両クライアントが同じ状態になることを確認
      const client1TaskOrder = getTaskOrderFromDoc(client1Doc);
      const client2TaskOrder = getTaskOrderFromDoc(client2Doc);

      expect(client1TaskOrder).toEqual(client2TaskOrder);
      expect(client1TaskOrder).toContain('task-from-client1');

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('競合する変更の解決をテストすること', async () => {
      const scenario = await createCompleteUserScenario({
        taskListName: '競合解決テスト',
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 共同編集を初期化
      await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/initialize`)
        .set(authHeaders)
        .send({});

      // 両クライアントが同じ初期状態を取得
      const initialResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/collaborative/full-state`)
        .set(authHeaders);

      const initialState = initialResponse.body.data;

      // クライアント1とクライアント2で異なる変更を行う
      const client1Doc = decodeYjsState(initialState.state);
      const client2Doc = decodeYjsState(initialState.state);

      addTaskToDoc(client1Doc, 'task-from-client1', 'top');
      addTaskToDoc(client2Doc, 'task-from-client2', 'bottom');

      // 両方の変更をサーバーに送信
      const client1Update = generateYjsUpdate(client1Doc, initialState.stateVector);
      const client2Update = generateYjsUpdate(client2Doc, initialState.stateVector);

      // クライアント1の変更を先に同期
      const client1SyncResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/sync`)
        .set(authHeaders)
        .send({
          stateVector: initialState.stateVector,
          update: client1Update,
        });

      expect(client1SyncResponse.status).toBe(200);

      // クライアント2の変更を同期
      const client2SyncResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/collaborative/sync`)
        .set(authHeaders)
        .send({
          stateVector: initialState.stateVector,
          update: client2Update,
        });

      expect(client2SyncResponse.status).toBe(200);

      // 最終状態を確認
      const finalStateResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/collaborative/full-state`)
        .set(authHeaders);

      const finalDoc = decodeYjsState(finalStateResponse.body.data.state);
      const finalTaskOrder = getTaskOrderFromDoc(finalDoc);

      // 両方のタスクが存在することを確認（Yjsの競合解決により）
      expect(finalTaskOrder).toContain('task-from-client1');
      expect(finalTaskOrder).toContain('task-from-client2');

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });
  });
});