import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';

describe('認証API', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    deviceId: 'test-device-id',
  };

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // テストヘルパー関数
  const cleanDatabase = async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.collaborativeSession.deleteMany({});
    await prisma.taskListDocument.deleteMany({});
    await prisma.taskListShare.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.taskList.deleteMany({});
    await prisma.settings.deleteMany({});
    await prisma.app.deleteMany({});
    await prisma.user.deleteMany({});
  };


  describe('POST /api/auth/register', () => {
    it('正常なユーザー登録ができること', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.data.expiresIn).toBe(3600);
    });

    it('デフォルトのAppとSettingsが作成されること', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
        include: {
          app: true,
          settings: true,
        },
      });

      expect(user).toBeTruthy();
      expect(user?.app).toBeTruthy();
      expect(user?.settings).toBeTruthy();
      expect(user?.app?.taskInsertPosition).toBe('top');
      expect(user?.app?.autoSort).toBe(false);
      expect(user?.settings?.theme).toBe('system');
      expect(user?.settings?.language).toBe('ja');
    });
  });

  describe('POST /api/auth/login', () => {
    it('正常なログインができること', async () => {
      // 先にユーザーを作成（登録APIを使用）
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          deviceId: 'login-device-id', // 異なるデバイスIDを使用
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.data.expiresIn).toBe(3600);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('有効なRefreshTokenでアクセストークンが更新できること', async () => {
      // 先にユーザーを作成してトークンを取得
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          deviceId: 'refresh-device-id', // 異なるデバイスIDを使用
        });

      const refreshToken = registerResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.data.expiresIn).toBe(3600);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('正常にログアウトできること', async () => {
      // 先にユーザーを作成してトークンを取得
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          deviceId: 'logout-device-id', // 異なるデバイスIDを使用
        });

      const refreshToken = registerResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
      expect(response.body.data).toBeNull();
    });

    it('RefreshTokenが無効化されること', async () => {
      // 先にユーザーを作成してトークンを取得
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          deviceId: 'logout-invalidate-device-id', // 異なるデバイスIDを使用
        });

      const refreshToken = registerResponse.body.data.refreshToken;

      // ログアウト
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      // 無効化されたトークンでリフレッシュを試行
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
    });
  });
});