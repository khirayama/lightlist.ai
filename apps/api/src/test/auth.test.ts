import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
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
    await prisma.passwordResetToken.deleteMany({});
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

    // 異常系テスト
    it('必須フィールドが欠如している場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(400);
    });

    it('不正なメールアドレス形式の場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          deviceId: 'test-device-id',
        });

      expect(response.status).toBe(400);
    });

    it('パスワードが短すぎる場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          deviceId: 'test-device-id',
        });

      expect(response.status).toBe(400);
    });

    it('deviceIdが欠如している場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
    });

    it('同じメールアドレスで再登録を試みた場合、409エラーが返ること', async () => {
      // 最初の登録
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // 同じメールで再登録
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: 'different-password',
          deviceId: 'different-device-id',
        });

      expect(response.status).toBe(409);
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

    // 異常系テスト
    it('存在しないユーザーでログインを試みた場合、401エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
          deviceId: 'login-device-id',
        });

      expect(response.status).toBe(401);
    });

    it('間違ったパスワードでログインを試みた場合、401エラーが返ること', async () => {
      // 先にユーザーを作成
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrong-password',
          deviceId: 'login-device-id',
        });

      expect(response.status).toBe(401);
    });

    it('必須フィールドが欠如している場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });

    it('不正なメールアドレス形式の場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
          deviceId: 'login-device-id',
        });

      expect(response.status).toBe(400);
    });

    it('deviceIdが欠如している場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
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

    // 異常系テスト
    it('無効なRefreshTokenでリフレッシュを試みた場合、401エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(response.status).toBe(401);
    });

    it('存在しないRefreshTokenでリフレッシュを試みた場合、401エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'non-existent-token' });

      expect(response.status).toBe(401);
    });

    it('refreshTokenが欠如している場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
    });

    it('空のrefreshTokenでリフレッシュを試みた場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: '' });

      expect(response.status).toBe(400);
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

    // 異常系テスト
    it('無効なRefreshTokenでログアウトを試みた場合、401エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(response.status).toBe(401);
    });

    it('存在しないRefreshTokenでログアウトを試みた場合、401エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'non-existent-token' });

      expect(response.status).toBe(401);
    });

    it('refreshTokenが欠如している場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(400);
    });

    it('空のrefreshTokenでログアウトを試みた場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: '' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('正常にパスワードリセットメールが送信されること', async () => {
      // 先にユーザーを作成
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
      expect(response.body.data).toBeNull();
    });

    it('存在しないメールアドレスでも成功を返すこと（セキュリティ上）', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
      expect(response.body.data).toBeNull();
    });

    it('不正なメールアドレス形式の場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });

    it('メールアドレスが欠如している場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
    });

    it('パスワードリセットトークンがDBに作成されること', async () => {
      // 先にユーザーを作成
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user?.id,
          isUsed: false,
        },
      });

      expect(resetToken).toBeTruthy();
      expect(resetToken?.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('有効なトークンでパスワードがリセットできること', async () => {
      // 先にユーザーを作成
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // パスワードリセットを要求
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      // DBからリセットトークンを取得
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user?.id,
          isUsed: false,
        },
      });

      expect(resetTokenRecord).toBeTruthy();

      // パスワードリセット実行
      const newPassword = 'newpassword123';
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetTokenRecord?.token,
          newPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset successful');
      expect(response.body.data).toBeNull();

      // 新しいパスワードでログインできることを確認
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
          deviceId: 'new-device-id',
        });

      expect(loginResponse.status).toBe(200);
    });

    it('リセットトークンが使用済みになること', async () => {
      // 先にユーザーを作成
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // パスワードリセットを要求
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      // DBからリセットトークンを取得
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user?.id,
          isUsed: false,
        },
      });

      // パスワードリセット実行
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetTokenRecord?.token,
          newPassword: 'newpassword123',
        });

      // トークンが使用済みになっていることを確認
      const usedToken = await prisma.passwordResetToken.findFirst({
        where: {
          id: resetTokenRecord?.id,
        },
      });

      expect(usedToken?.isUsed).toBe(true);
    });

    it('既存のリフレッシュトークンが無効化されること', async () => {
      // 先にユーザーを作成
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const oldRefreshToken = registerResponse.body.data.refreshToken;

      // パスワードリセットを要求
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      // DBからリセットトークンを取得
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user?.id,
          isUsed: false,
        },
      });

      // パスワードリセット実行
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetTokenRecord?.token,
          newPassword: 'newpassword123',
        });

      // 古いリフレッシュトークンが使用できないことを確認
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(refreshResponse.status).toBe(401);
    });

    it('無効なトークンでリセットを試みた場合、401エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(401);
    });

    it('使用済みトークンでリセットを試みた場合、401エラーが返ること', async () => {
      // 先にユーザーを作成
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // パスワードリセットを要求
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      // DBからリセットトークンを取得
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user?.id,
          isUsed: false,
        },
      });

      // 最初のパスワードリセット実行
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetTokenRecord?.token,
          newPassword: 'newpassword123',
        });

      // 同じトークンで再度リセットを試行
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetTokenRecord?.token,
          newPassword: 'anotherpassword123',
        });

      expect(response.status).toBe(401);
    });

    it('必須フィールドが欠如している場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({});

      expect(response.status).toBe(400);
    });

    it('パスワードが短すぎる場合、400エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
          newPassword: '123',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('セキュリティとエラーハンドリング', () => {
    it('パスワードリセット後、古いトークンは全て無効化されること', async () => {
      // ユーザーを作成し、複数のリフレッシュトークンを生成
      const registerResponse1 = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          deviceId: 'device-1',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          deviceId: 'device-2',
        });

      const refreshToken1 = registerResponse1.body.data.refreshToken;
      const refreshToken2 = loginResponse.body.data.refreshToken;

      // パスワードリセットを実行
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user?.id,
          isUsed: false,
        },
      });

      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetTokenRecord?.token,
          newPassword: 'newpassword123',
        });

      // 全ての古いリフレッシュトークンが無効化されていることを確認
      const refreshResponse1 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: refreshToken1 });

      const refreshResponse2 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: refreshToken2 });

      expect(refreshResponse1.status).toBe(401);
      expect(refreshResponse2.status).toBe(401);
    });

    it('複数回のパスワードリセット要求で古いトークンが無効化されること', async () => {
      // ユーザーを作成
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // 最初のパスワードリセット要求
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      const firstResetToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user?.id,
          isUsed: false,
        },
      });

      // 2回目のパスワードリセット要求
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      // 最初のトークンが無効化されていることを確認
      const invalidatedToken = await prisma.passwordResetToken.findFirst({
        where: {
          id: firstResetToken?.id,
        },
      });

      expect(invalidatedToken?.isUsed).toBe(true);
    });

    it('期限切れのリセットトークンは使用できないこと', async () => {
      // ユーザーを作成
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      // 期限切れのリセットトークンを直接作成
      const expiredToken = jwt.sign(
        { userId: user?.id, type: 'password-reset' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // 1時間前に期限切れ
      );

      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      await prisma.passwordResetToken.create({
        data: {
          userId: user?.id || '',
          token: expiredToken,
          expiresAt: pastDate,
        },
      });

      // 期限切れトークンでリセットを試行
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(401);
    });

    it('不正なJWTトークンでリセットを試みた場合、401エラーが返ること', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid.jwt.token',
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(401);
    });

    it('正しい形式だが異なる秘密鍵で作成されたトークンは拒否されること', async () => {
      // 異なる秘密鍵でトークンを作成
      const fakeToken = jwt.sign(
        { userId: 'fake-user-id', type: 'password-reset' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: fakeToken,
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(401);
    });
  });
});