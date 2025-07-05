import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import { cleanDatabase } from '@/test/helpers';

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