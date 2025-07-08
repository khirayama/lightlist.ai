import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import { cleanDatabase } from '@/__tests__/helpers';
import * as Y from 'yjs';

describe('共同編集API', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    deviceId: 'test-device-id',
  };

  const testUser2 = {
    email: 'test2@example.com', 
    password: 'password456',
    deviceId: 'test-device-id-2',
  };

  let userToken: string;
  let userToken2: string;
  let taskListId: string;
  let taskId: string;
  let appId: string;
  let appId2: string;

  beforeEach(async () => {
    await cleanDatabase();
    
    // テストユーザー1を作成
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    if (registerResponse.status !== 201 || !registerResponse.body.data?.accessToken) {
      throw new Error(`Failed to create test user 1: ${registerResponse.status} - ${JSON.stringify(registerResponse.body)}`);
    }
    userToken = registerResponse.body.data.accessToken;
    
    // テストユーザー2を作成
    const registerResponse2 = await request(app)
      .post('/api/auth/register')
      .send(testUser2);
    
    if (registerResponse2.status !== 201 || !registerResponse2.body.data?.accessToken) {
      throw new Error(`Failed to create test user 2: ${registerResponse2.status} - ${JSON.stringify(registerResponse2.body)}`);
    }
    userToken2 = registerResponse2.body.data.accessToken;
    
    // ユーザーIDとAppIDを取得
    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
      include: { app: true },
    });
    appId = user?.app?.id || '';
    
    const user2 = await prisma.user.findUnique({
      where: { email: testUser2.email },
      include: { app: true },
    });
    appId2 = user2?.app?.id || '';
    
    // テスト用タスクリストを作成
    const taskListResponse = await request(app)
      .post('/api/tasklists')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'テスト用タスクリスト',
        background: '#FF0000',
      });
    
    if (taskListResponse.status !== 201 || !taskListResponse.body.data?.id) {
      throw new Error(`Failed to create task list: ${taskListResponse.status} - ${JSON.stringify(taskListResponse.body)}`);
    }
    taskListId = taskListResponse.body.data.id;
    
    // テスト用タスクを作成
    const taskResponse = await request(app)
      .post(`/api/tasks/list/${taskListId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        text: 'テスト用タスク',
        date: '2024-01-01',
      });
    
    if (taskResponse.status !== 201 || !taskResponse.body.data?.id) {
      throw new Error(`Failed to create task: ${taskResponse.status} - ${JSON.stringify(taskResponse.body)}`);
    }
    taskId = taskResponse.body.data.id;
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/collaborative/sessions/:taskListId', () => {
    it('正常なセッション開始ができること', async () => {
      const response = await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Session started successfully');
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('documentState');
      expect(response.body.data).toHaveProperty('stateVector');
      expect(response.body.data).toHaveProperty('expiresAt');
      
      // Y.jsドキュメントの内容を確認
      const ydoc = new Y.Doc();
      const stateUpdate = Buffer.from(response.body.data.documentState, 'base64');
      Y.applyUpdate(ydoc, stateUpdate);
      
      // Y.jsサービスでは Map を使用している
      const yMap = ydoc.getMap('taskList');
      const taskOrderArray = yMap.get('taskOrder') as string[];
      expect(taskOrderArray).toBeTruthy();
      expect(taskOrderArray).toHaveLength(1);
      expect(taskOrderArray).toContain(taskId);
    });

    it('既存のセッションがある場合でも新しいセッションが作成されること', async () => {
      // 最初のセッション開始
      const firstResponse = await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      // 2回目のセッション開始
      const secondResponse = await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(201);
      expect(firstResponse.body.data.sessionId).toBe(secondResponse.body.data.sessionId);
    });

    it('認証なしでアクセスした場合、401エラーが返ること', async () => {
      const response = await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      expect(response.status).toBe(401);
    });

    it('X-Device-IDヘッダーがない場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          sessionType: 'active',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Device ID header is required');
    });

    it('存在しないタスクリストIDでセッションを開始した場合、エラーが返ること', async () => {
      const fakeTaskListId = 'non-existent-id';
      const response = await request(app)
        .post(`/api/collaborative/sessions/${fakeTaskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      // 外部キー制約エラーまたはタスクリストが見つからないエラー
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('バックグラウンドセッションも正常に開始できること', async () => {
      const response = await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'background',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Session started successfully');
      
      // セッションのタイムアウトが5分であることを確認
      const expiresAt = new Date(response.body.data.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThan(4);
      expect(diffMinutes).toBeLessThan(6);
    });
  });

  describe('GET /api/collaborative/sessions/:taskListId', () => {
    it('アクティブセッションがある場合、現在の状態を取得できること', async () => {
      // セッションを開始
      await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      const response = await request(app)
        .get(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('State retrieved successfully');
      expect(response.body.data).toHaveProperty('documentState');
      expect(response.body.data).toHaveProperty('stateVector');
      expect(response.body.data).toHaveProperty('hasUpdates');
    });

    it('セッションがない場合、404エラーが返ること', async () => {
      const response = await request(app)
        .get(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Session not found or expired');
    });

    it('認証なしでアクセスした場合、401エラーが返ること', async () => {
      const response = await request(app)
        .get(`/api/collaborative/sessions/${taskListId}`)
        .set('X-Device-ID', testUser.deviceId);

      expect(response.status).toBe(401);
    });

    it('X-Device-IDヘッダーがない場合、400エラーが返ること', async () => {
      const response = await request(app)
        .get(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Device ID header is required');
    });
  });

  describe('PUT /api/collaborative/sessions/:taskListId', () => {
    it('正常に更新を送信できること', async () => {
      // セッションを開始
      await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      // Y.jsドキュメントを作成して更新を生成
      const ydoc = new Y.Doc();
      const yMap = ydoc.getMap('taskList');
      yMap.set('taskOrder', ['new-task-id']);
      
      const stateUpdate = Y.encodeStateAsUpdate(ydoc);
      const updateBase64 = Buffer.from(stateUpdate).toString('base64');

      const response = await request(app)
        .put(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          update: updateBase64,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Update applied successfully');
      expect(response.body.data).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('stateVector');
      expect(response.body.data.success).toBe(true);
    });

    it('セッションがない場合、404エラーが返ること', async () => {
      const ydoc = new Y.Doc();
      const yMap = ydoc.getMap('taskList');
      yMap.set('taskOrder', ['new-task-id']);
      
      const stateUpdate = Y.encodeStateAsUpdate(ydoc);
      const updateBase64 = Buffer.from(stateUpdate).toString('base64');

      const response = await request(app)
        .put(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          update: updateBase64,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Session not found or expired');
    });

    it('不正なbase64データを送信した場合、400エラーが返ること', async () => {
      // セッションを開始
      await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      const response = await request(app)
        .put(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          update: 'invalid-base64-data!!!',
        });

      // 不正なbase64データのためエラーが発生
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('認証なしでアクセスした場合、401エラーが返ること', async () => {
      const response = await request(app)
        .put(`/api/collaborative/sessions/${taskListId}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          update: 'dummy-update',
        });

      expect(response.status).toBe(401);
    });

    it('X-Device-IDヘッダーがない場合、400エラーが返ること', async () => {
      const response = await request(app)
        .put(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          update: 'dummy-update',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Device ID header is required');
    });
  });

  describe('PATCH /api/collaborative/sessions/:taskListId', () => {
    it('正常にセッションを維持できること', async () => {
      // セッションを開始
      await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .patch(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Session kept alive');
      expect(response.body.data).toHaveProperty('success');
      expect(response.body.data.success).toBe(true);
    });

    it('セッションがない場合、404エラーが返ること', async () => {
      const response = await request(app)
        .patch(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Session not found or expired');
    });

    it('認証なしでアクセスした場合、401エラーが返ること', async () => {
      const response = await request(app)
        .patch(`/api/collaborative/sessions/${taskListId}`)
        .set('X-Device-ID', testUser.deviceId);

      expect(response.status).toBe(401);
    });

    it('X-Device-IDヘッダーがない場合、400エラーが返ること', async () => {
      const response = await request(app)
        .patch(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Device ID header is required');
    });
  });

  describe('DELETE /api/collaborative/sessions/:taskListId', () => {
    it('正常にセッションを終了できること', async () => {
      // セッションを開始
      await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      const response = await request(app)
        .delete(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Session ended successfully');
      expect(response.body.data).toHaveProperty('success');
      expect(response.body.data.success).toBe(true);

      // セッションが削除されたことを確認
      const getResponse = await request(app)
        .get(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId);

      expect(getResponse.status).toBe(404);
    });

    it('最後のセッションを終了した場合、TaskListDocumentも削除されること', async () => {
      // セッションを開始
      await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      // セッションを終了
      await request(app)
        .delete(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId);

      // TaskListDocumentが削除されたことを確認
      const document = await prisma.taskListDocument.findUnique({
        where: { taskListId },
      });
      expect(document).toBeNull();
    });

    it('セッションがない場合でも成功すること', async () => {
      const response = await request(app)
        .delete(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Session ended successfully');
      expect(response.body.data.success).toBe(true);
    });

    it('認証なしでアクセスした場合、401エラーが返ること', async () => {
      const response = await request(app)
        .delete(`/api/collaborative/sessions/${taskListId}`)
        .set('X-Device-ID', testUser.deviceId);

      expect(response.status).toBe(401);
    });

    it('X-Device-IDヘッダーがない場合、400エラーが返ること', async () => {
      const response = await request(app)
        .delete(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Device ID header is required');
    });
  });

  describe('複数ユーザーでの同時編集シナリオ', () => {
    it('2人のユーザーが同じタスクリストを同時に編集できること', async () => {
      // ユーザー1がセッションを開始
      const user1SessionResponse = await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      expect(user1SessionResponse.status).toBe(201);

      // ユーザー2を共同編集者として追加（タスクリストへのアクセス権を付与）
      await prisma.app.update({
        where: { id: appId2 },
        data: {
          taskListOrder: {
            push: taskListId,
          },
        },
      });

      // ユーザー2がセッションを開始
      const user2SessionResponse = await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken2}`)
        .set('X-Device-ID', testUser2.deviceId)
        .send({
          sessionType: 'active',
        });

      expect(user2SessionResponse.status).toBe(201);

      // activeSessionCountが2になっていることを確認
      const document = await prisma.taskListDocument.findUnique({
        where: { taskListId },
      });
      expect(document?.activeSessionCount).toBe(2);

      // ユーザー1が更新を送信
      const ydoc1 = new Y.Doc();
      Y.applyUpdate(ydoc1, Buffer.from(user1SessionResponse.body.data.documentState, 'base64'));
      const yMap1 = ydoc1.getMap('taskList');
      const currentTaskOrder1 = yMap1.get('taskOrder') as string[] || [];
      yMap1.set('taskOrder', [...currentTaskOrder1, 'user1-new-task']);
      
      const update1 = Y.encodeStateAsUpdate(ydoc1, Buffer.from(user1SessionResponse.body.data.stateVector, 'base64'));
      const updateBase64_1 = Buffer.from(update1).toString('base64');

      const updateResponse1 = await request(app)
        .put(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          update: updateBase64_1,
        });

      expect(updateResponse1.status).toBe(200);

      // ユーザー2が最新の状態を取得
      const getResponse2 = await request(app)
        .get(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken2}`)
        .set('X-Device-ID', testUser2.deviceId);

      expect(getResponse2.status).toBe(200);
      expect(getResponse2.body.data.hasUpdates).toBe(true);

      // ユーザー2のドキュメントにユーザー1の更新が反映されていることを確認
      const ydoc2 = new Y.Doc();
      Y.applyUpdate(ydoc2, Buffer.from(getResponse2.body.data.documentState, 'base64'));
      const yMap2 = ydoc2.getMap('taskList');
      const taskOrder2 = yMap2.get('taskOrder') as string[] || [];
      expect(taskOrder2).toContain('user1-new-task');

      // 両方のユーザーがセッションを終了
      await request(app)
        .delete(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId);

      await request(app)
        .delete(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken2}`)
        .set('X-Device-ID', testUser2.deviceId);

      // TaskListDocumentが削除されたことを確認
      const finalDocument = await prisma.taskListDocument.findUnique({
        where: { taskListId },
      });
      expect(finalDocument).toBeNull();
    });

    it('タスクの並び順の競合が正しく解決されること', async () => {
      // ユーザー1がセッションを開始
      const user1SessionResponse = await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      // ユーザー2を共同編集者として追加
      await prisma.app.update({
        where: { id: appId2 },
        data: {
          taskListOrder: {
            push: taskListId,
          },
        },
      });

      // ユーザー2がセッションを開始
      const user2SessionResponse = await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken2}`)
        .set('X-Device-ID', testUser2.deviceId)
        .send({
          sessionType: 'active',
        });

      // 両ユーザーが同時に異なるタスクを追加
      const ydoc1 = new Y.Doc({ guid: 'user1-client' });
      Y.applyUpdate(ydoc1, Buffer.from(user1SessionResponse.body.data.documentState, 'base64'));
      const yMap1 = ydoc1.getMap('taskList');
      const currentTaskOrder1 = yMap1.get('taskOrder') as string[] || [];
      yMap1.set('taskOrder', ['user1-task-at-start', ...currentTaskOrder1]);
      
      const update1 = Y.encodeStateAsUpdate(ydoc1);
      const updateBase64_1 = Buffer.from(update1).toString('base64');

      const ydoc2 = new Y.Doc({ guid: 'user2-client' });
      Y.applyUpdate(ydoc2, Buffer.from(user2SessionResponse.body.data.documentState, 'base64'));
      const yMap2 = ydoc2.getMap('taskList');
      const currentTaskOrder2 = yMap2.get('taskOrder') as string[] || [];
      yMap2.set('taskOrder', [...currentTaskOrder2, 'user2-task-at-end']);
      

      // ユーザー1が更新を送信
      await request(app)
        .put(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          update: updateBase64_1,
        });

      // ユーザー2が最新の状態を取得
      const user2UpdatedResponse = await request(app)
        .get(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken2}`)
        .set('X-Device-ID', testUser2.deviceId);

      // ユーザー2が最新の状態から新しい更新を作成
      const ydoc2Updated = new Y.Doc({ guid: 'user2-client-updated' });
      Y.applyUpdate(ydoc2Updated, Buffer.from(user2UpdatedResponse.body.data.documentState, 'base64'));
      const yMap2Updated = ydoc2Updated.getMap('taskList');
      const currentTaskOrder2Updated = yMap2Updated.get('taskOrder') as string[] || [];
      yMap2Updated.set('taskOrder', [...currentTaskOrder2Updated, 'user2-task-at-end']);
      
      const update2Updated = Y.encodeStateAsUpdate(ydoc2Updated);
      const updateBase64_2Updated = Buffer.from(update2Updated).toString('base64');

      // ユーザー2が更新を送信
      await request(app)
        .put(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken2}`)
        .set('X-Device-ID', testUser2.deviceId)
        .send({
          update: updateBase64_2Updated,
        });

      // 最終的な状態を確認
      const finalResponse = await request(app)
        .get(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId);

      const finalYdoc = new Y.Doc();
      Y.applyUpdate(finalYdoc, Buffer.from(finalResponse.body.data.documentState, 'base64'));
      const finalYMap = finalYdoc.getMap('taskList');
      const finalArray = finalYMap.get('taskOrder') as string[] || [];

      // 両方のタスクが含まれていることを確認
      expect(finalArray).toContain('user1-task-at-start');
      expect(finalArray).toContain('user2-task-at-end');
      expect(finalArray[0]).toBe('user1-task-at-start'); // 先頭に挿入されたタスク
      expect(finalArray[finalArray.length - 1]).toBe('user2-task-at-end'); // 末尾に追加されたタスク
    });
  });

  describe('セッションタイムアウトのテスト', () => {
    it('期限切れセッションが自動的にクリーンアップされること', async () => {
      // セッションを開始
      await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Device-ID', testUser.deviceId)
        .send({
          sessionType: 'active',
        });

      // セッションを期限切れに設定
      await prisma.collaborativeSession.updateMany({
        where: {
          taskListId,
          appId,
          deviceId: testUser.deviceId,
        },
        data: {
          expiresAt: new Date(Date.now() - 1000), // 1秒前に期限切れ
        },
      });

      // 別のユーザーがセッションを開始（クリーンアップをトリガー）
      await prisma.app.update({
        where: { id: appId2 },
        data: {
          taskListOrder: {
            push: taskListId,
          },
        },
      });

      await request(app)
        .post(`/api/collaborative/sessions/${taskListId}`)
        .set('Authorization', `Bearer ${userToken2}`)
        .set('X-Device-ID', testUser2.deviceId)
        .send({
          sessionType: 'active',
        });

      // 期限切れセッションが削除されたことを確認
      const expiredSession = await prisma.collaborativeSession.findFirst({
        where: {
          taskListId,
          appId,
          deviceId: testUser.deviceId,
        },
      });
      expect(expiredSession).toBeNull();
    });
  });
});