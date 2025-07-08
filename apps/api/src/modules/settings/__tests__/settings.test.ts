import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import { cleanDatabase } from '@/__tests__/helpers';

describe('設定系API', () => {
  const testUser = {
    email: 'settings-test@example.com',
    password: 'password123',
    deviceId: 'settings-test-device-id',
  };

  let accessToken: string;

  beforeEach(async () => {
    await cleanDatabase();
    
    // テスト用ユーザーを作成しアクセストークンを取得
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    if (registerResponse.status !== 201 || !registerResponse.body.data?.accessToken) {
      throw new Error(`Failed to create test user: ${registerResponse.status} - ${JSON.stringify(registerResponse.body)}`);
    }
    
    accessToken = registerResponse.body.data.accessToken;
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // 最適化されたヘルパー関数をインポートして使用

  describe('GET /api/settings', () => {
    it('認証されたユーザーの設定が取得できること', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Settings retrieved successfully');
      expect(response.body.data).toHaveProperty('theme');
      expect(response.body.data).toHaveProperty('language');
      expect(response.body.data.theme).toBe('system');
      expect(response.body.data.language).toBe('ja');
    });

    it('認証されていない場合、401エラーが返ること', async () => {
      const response = await request(app)
        .get('/api/settings');

      expect(response.status).toBe(401);
    });

    it('無効なアクセストークンの場合、401エラーが返ること', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/settings', () => {
    it('テーマ設定を更新できること', async () => {
      const response = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ theme: 'dark' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Settings updated successfully');
      expect(response.body.data.theme).toBe('dark');
      expect(response.body.data.language).toBe('ja');
    });

    it('言語設定を更新できること', async () => {
      const response = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ language: 'en' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Settings updated successfully');
      expect(response.body.data.theme).toBe('system');
      expect(response.body.data.language).toBe('en');
    });

    it('テーマと言語設定を同時に更新できること', async () => {
      const response = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ theme: 'light', language: 'en' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Settings updated successfully');
      expect(response.body.data.theme).toBe('light');
      expect(response.body.data.language).toBe('en');
    });

    it('設定がDBに正しく保存されること', async () => {
      await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ theme: 'dark', language: 'en' });

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
        include: { settings: true },
      });

      expect(user?.settings?.theme).toBe('dark');
      expect(user?.settings?.language).toBe('en');
    });

    it('認証されていない場合、401エラーが返ること', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ theme: 'dark' });

      expect(response.status).toBe(401);
    });

    it('無効なアクセストークンの場合、401エラーが返ること', async () => {
      const response = await request(app)
        .put('/api/settings')
        .set('Authorization', 'Bearer invalid-token')
        .send({ theme: 'dark' });

      expect(response.status).toBe(401);
    });

    it('無効なテーマ値の場合、400エラーが返ること', async () => {
      const response = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ theme: 'invalid-theme' });

      expect(response.status).toBe(400);
    });

    it('空のボディの場合でも成功すること', async () => {
      const response = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Settings updated successfully');
    });

    it('事前設定後の部分更新で他の値が保持されること（テーマ更新）', async () => {
      // Step 1: 両方を初期値以外に設定
      const setupResponse = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ theme: 'dark', language: 'en' });

      expect(setupResponse.status).toBe(200);
      expect(setupResponse.body.data.theme).toBe('dark');
      expect(setupResponse.body.data.language).toBe('en');

      // Step 2: テーマのみ更新
      const updateResponse = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ theme: 'light' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.theme).toBe('light');
      // 言語は前回設定した値が保持されるべき
      expect(updateResponse.body.data.language).toBe('en');
    });

    it('事前設定後の部分更新で他の値が保持されること（言語更新）', async () => {
      // Step 1: 両方を初期値以外に設定
      const setupResponse = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ theme: 'light', language: 'en' });

      expect(setupResponse.status).toBe(200);
      expect(setupResponse.body.data.theme).toBe('light');
      expect(setupResponse.body.data.language).toBe('en');

      // Step 2: 言語のみ更新
      const updateResponse = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ language: 'ja' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.language).toBe('ja');
      // テーマは前回設定した値が保持されるべき
      expect(updateResponse.body.data.theme).toBe('light');
    });
  });

  describe('GET /api/app', () => {
    it('認証されたユーザーのApp設定が取得できること', async () => {
      const response = await request(app)
        .get('/api/app')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('App settings retrieved successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('taskInsertPosition');
      expect(response.body.data).toHaveProperty('autoSort');
      expect(response.body.data.taskInsertPosition).toBe('top');
      expect(response.body.data.autoSort).toBe(false);
    });

    it('認証されていない場合、401エラーが返ること', async () => {
      const response = await request(app)
        .get('/api/app');

      expect(response.status).toBe(401);
    });

    it('無効なアクセストークンの場合、401エラーが返ること', async () => {
      const response = await request(app)
        .get('/api/app')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/app', () => {
    it('タスク挿入位置を更新できること', async () => {
      const response = await request(app)
        .put('/api/app')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskInsertPosition: 'bottom' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('App settings updated successfully');
      expect(response.body.data.taskInsertPosition).toBe('bottom');
      expect(response.body.data.autoSort).toBe(false);
    });

    it('自動ソート設定を更新できること', async () => {
      const response = await request(app)
        .put('/api/app')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ autoSort: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('App settings updated successfully');
      expect(response.body.data.taskInsertPosition).toBe('top');
      expect(response.body.data.autoSort).toBe(true);
    });

    it('タスク挿入位置と自動ソート設定を同時に更新できること', async () => {
      const response = await request(app)
        .put('/api/app')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskInsertPosition: 'bottom', autoSort: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('App settings updated successfully');
      expect(response.body.data.taskInsertPosition).toBe('bottom');
      expect(response.body.data.autoSort).toBe(true);
    });

    it('設定がDBに正しく保存されること', async () => {
      await request(app)
        .put('/api/app')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskInsertPosition: 'bottom', autoSort: true });

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
        include: { app: true },
      });

      expect(user?.app?.taskInsertPosition).toBe('bottom');
      expect(user?.app?.autoSort).toBe(true);
    });

    it('認証されていない場合、401エラーが返ること', async () => {
      const response = await request(app)
        .put('/api/app')
        .send({ taskInsertPosition: 'bottom' });

      expect(response.status).toBe(401);
    });

    it('無効なアクセストークンの場合、401エラーが返ること', async () => {
      const response = await request(app)
        .put('/api/app')
        .set('Authorization', 'Bearer invalid-token')
        .send({ taskInsertPosition: 'bottom' });

      expect(response.status).toBe(401);
    });

    it('無効なタスク挿入位置の場合、400エラーが返ること', async () => {
      const response = await request(app)
        .put('/api/app')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskInsertPosition: 'invalid-position' });

      expect(response.status).toBe(400);
    });

    it('空のボディの場合でも成功すること', async () => {
      const response = await request(app)
        .put('/api/app')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('App settings updated successfully');
    });

    it('事前設定後の部分更新で他の値が保持されること（taskInsertPosition更新）', async () => {
      // Step 1: 両方を初期値以外に設定
      const setupResponse = await request(app)
        .put('/api/app')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskInsertPosition: 'bottom', autoSort: true });

      expect(setupResponse.status).toBe(200);
      expect(setupResponse.body.data.taskInsertPosition).toBe('bottom');
      expect(setupResponse.body.data.autoSort).toBe(true);

      // Step 2: taskInsertPositionのみ更新
      const updateResponse = await request(app)
        .put('/api/app')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskInsertPosition: 'top' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.taskInsertPosition).toBe('top');
      // autoSortは前回設定した値が保持されるべき
      expect(updateResponse.body.data.autoSort).toBe(true);
    });

    it('事前設定後の部分更新で他の値が保持されること（autoSort更新）', async () => {
      // Step 1: 両方を初期値以外に設定
      const setupResponse = await request(app)
        .put('/api/app')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskInsertPosition: 'bottom', autoSort: true });

      expect(setupResponse.status).toBe(200);
      expect(setupResponse.body.data.taskInsertPosition).toBe('bottom');
      expect(setupResponse.body.data.autoSort).toBe(true);

      // Step 2: autoSortのみ更新
      const updateResponse = await request(app)
        .put('/api/app')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ autoSort: false });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.autoSort).toBe(false);
      // taskInsertPositionは前回設定した値が保持されるべき
      expect(updateResponse.body.data.taskInsertPosition).toBe('bottom');
    });
  });

  describe('GET /api/app/taskListOrder', () => {
    it('認証されたユーザーのタスクリストの並び順が取得できること', async () => {
      const response = await request(app)
        .get('/api/app/taskListOrder')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Task list order retrieved successfully');
      expect(response.body.data).toHaveProperty('taskListOrder');
      expect(Array.isArray(response.body.data.taskListOrder)).toBe(true);
      expect(response.body.data.taskListOrder).toEqual([]);
    });

    it('認証されていない場合、401エラーが返ること', async () => {
      const response = await request(app)
        .get('/api/app/taskListOrder');

      expect(response.status).toBe(401);
    });

    it('無効なアクセストークンの場合、401エラーが返ること', async () => {
      const response = await request(app)
        .get('/api/app/taskListOrder')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});