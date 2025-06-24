import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { 
  getTestRequest, 
  getTestPrisma, 
  generateAuthHeader,
  createAuthenticatedUser,
  createCompleteUserScenario,
  createMultipleDevicesForUser,
  generateUniqueUserData,
  generateUniqueTaskListName,
  generateUniqueTaskText,
  cleanupTestScenario
} from '../utils/test-helpers';
import { 
  cleanupTestDatabase, 
  teardownTestDatabase
} from '../setup';

describe('複数デバイス管理フローシナリオ', () => {
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

  describe('基本的な複数デバイス機能', () => {
    it('同じユーザーが複数デバイスからログインできること', async () => {
      // Step 1: ユーザーをデバイス1で登録
      const userData = generateUniqueUserData({
        email: 'multidevice@example.com',
        password: 'MultiDevice123',
      });

      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      const device1Tokens = registerResponse.body.data;

      // Step 2: 同じユーザーをデバイス2でログイン
      const device2Data = {
        email: userData.email,
        password: userData.password,
        deviceId: generateUniqueUserData().deviceId,
      };

      const device2LoginResponse = await request
        .post('/api/auth/login')
        .send(device2Data);

      expect(device2LoginResponse.status).toBe(200);
      const device2Tokens = device2LoginResponse.body.data;

      // Step 3: デバイス3でもログイン
      const device3Data = {
        email: userData.email,
        password: userData.password,
        deviceId: generateUniqueUserData().deviceId,
      };

      const device3LoginResponse = await request
        .post('/api/auth/login')
        .send(device3Data);

      expect(device3LoginResponse.status).toBe(200);
      const device3Tokens = device3LoginResponse.body.data;

      // Step 4: 各デバイスで独立してAPIアクセスできることを確認
      const device1Headers = generateAuthHeader(device1Tokens.token);
      const device2Headers = generateAuthHeader(device2Tokens.token);
      const device3Headers = generateAuthHeader(device3Tokens.token);

      const [health1, health2, health3] = await Promise.all([
        request.get('/health').set(device1Headers),
        request.get('/health').set(device2Headers),
        request.get('/health').set(device3Headers),
      ]);

      expect(health1.status).toBe(200);
      expect(health2.status).toBe(200);
      expect(health3.status).toBe(200);

      // Step 5: データベースで3つのアクティブなリフレッシュトークンが存在することを確認
      const activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId: device1Tokens.user.id,
          isActive: true,
        },
      });

      expect(activeTokens).toHaveLength(3);

      // 各デバイスIDが異なることを確認
      const deviceIds = activeTokens.map(token => token.deviceId);
      const uniqueDeviceIds = new Set(deviceIds);
      expect(uniqueDeviceIds.size).toBe(3);

      // Cleanup
      await cleanupTestScenario(device1Tokens.user.id);
    });

    it('各デバイスで独立したトークンリフレッシュができること', async () => {
      // ユーザーと複数デバイスを作成
      const authUser = await createAuthenticatedUser({
        email: 'refresh@example.com',
        password: 'RefreshTest123',
      });

      const devices = await createMultipleDevicesForUser(authUser.user, 3);

      // 各デバイスでトークンリフレッシュ
      const refreshPromises = devices.map(device =>
        request
          .post('/api/auth/refresh')
          .send({
            refreshToken: device.tokens.refreshToken,
            deviceId: device.deviceId,
          })
      );

      const refreshResponses = await Promise.all(refreshPromises);

      // 全てのデバイスでリフレッシュが成功することを確認
      for (const response of refreshResponses) {
        expect(response.status).toBe(200);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
      }

      // 新しいトークンが全て異なることを確認
      const newTokens = refreshResponses.map(response => response.body.data.token);
      const uniqueTokens = new Set(newTokens);
      expect(uniqueTokens.size).toBe(devices.length);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('デバイス制限機能', () => {
    it('デバイス制限（5台）を正しく管理すること', async () => {
      const userData = generateUniqueUserData({
        email: 'devicelimit@example.com',
        password: 'DeviceLimit123',
      });

      // ユーザーを登録（デバイス1）
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      const userId = registerResponse.body.data.user.id;

      // 追加で4台のデバイスからログイン（合計5台、制限値）
      for (let i = 0; i < 4; i++) {
        const deviceData = {
          email: userData.email,
          password: userData.password,
          deviceId: generateUniqueUserData().deviceId,
        };

        const loginResponse = await request
          .post('/api/auth/login')
          .send(deviceData);

        expect(loginResponse.status).toBe(200);
      }

      // 5台のアクティブなトークンが存在することを確認
      let activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(activeTokens).toHaveLength(5);
      const oldestTokenId = activeTokens[0]?.id;

      // 6台目のデバイスからログイン（制限を超える）
      const device6Data = {
        email: userData.email,
        password: userData.password,
        deviceId: generateUniqueUserData().deviceId,
      };

      const device6LoginResponse = await request
        .post('/api/auth/login')
        .send(device6Data);

      expect(device6LoginResponse.status).toBe(200);

      // まだ5台のアクティブなトークンのみ存在することを確認
      activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      expect(activeTokens).toHaveLength(5);

      // 最古のトークンが非アクティブになっていることを確認
      const oldestToken = await prisma.refreshToken.findUnique({
        where: { id: oldestTokenId },
      });

      expect(oldestToken?.isActive).toBe(false);

      // Cleanup
      await cleanupTestScenario(userId);
    });

    it('デバイス制限による自動削除が正しく動作すること', async () => {
      const userData = generateUniqueUserData({
        email: 'autodelete@example.com',
        password: 'AutoDelete123',
      });

      // ユーザーを登録
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const userId = registerResponse.body.data.user.id;
      const device1Tokens = registerResponse.body.data;

      // 4台追加でログイン（合計5台）
      const deviceTokens = [];
      for (let i = 0; i < 4; i++) {
        const deviceData = {
          email: userData.email,
          password: userData.password,
          deviceId: generateUniqueUserData().deviceId,
        };

        const loginResponse = await request
          .post('/api/auth/login')
          .send(deviceData);

        deviceTokens.push({
          deviceId: deviceData.deviceId,
          tokens: loginResponse.body.data,
        });
      }

      // 初期デバイス（デバイス1）のトークンでAPIアクセスできることを確認
      const device1Headers = generateAuthHeader(device1Tokens.token);
      const initialHealthResponse = await request
        .get('/health')
        .set(device1Headers);

      expect(initialHealthResponse.status).toBe(200);

      // 6台目のデバイスからログイン（デバイス1が削除されるはず）
      const device6Data = {
        email: userData.email,
        password: userData.password,
        deviceId: generateUniqueUserData().deviceId,
      };

      const device6LoginResponse = await request
        .post('/api/auth/login')
        .send(device6Data);

      expect(device6LoginResponse.status).toBe(200);

      // デバイス1のリフレッシュトークンが無効になっていることを確認
      const device1RefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: device1Tokens.refreshToken,
          deviceId: userData.deviceId,
        });

      expect(device1RefreshResponse.status).toBe(401);

      // 他のデバイスは依然として有効であることを確認
      const device2RefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: deviceTokens[0]?.tokens.refreshToken,
          deviceId: deviceTokens[0]?.deviceId,
        });

      expect(device2RefreshResponse.status).toBe(200);

      // Cleanup
      await cleanupTestScenario(userId);
    });
  });

  describe('クロスデバイス操作', () => {
    it('一つのデバイスでのログアウトが他のデバイスに影響しないこと', async () => {
      // 複数デバイスでログインしたユーザーシナリオを作成
      const scenario = await createCompleteUserScenario({
        email: 'crossdevice@example.com',
        password: 'CrossDevice123',
      });

      // 追加のデバイスからログイン
      const device2Data = {
        email: 'crossdevice@example.com',
        password: 'CrossDevice123',
        deviceId: generateUniqueUserData().deviceId,
      };

      const device2LoginResponse = await request
        .post('/api/auth/login')
        .send(device2Data);

      expect(device2LoginResponse.status).toBe(200);
      const device2Tokens = device2LoginResponse.body.data;

      const device1Headers = generateAuthHeader(scenario.tokens.token);
      const device2Headers = generateAuthHeader(device2Tokens.token);

      // 両デバイスでAPIアクセスできることを確認
      const [health1, health2] = await Promise.all([
        request.get('/health').set(device1Headers),
        request.get('/health').set(device2Headers),
      ]);

      expect(health1.status).toBe(200);
      expect(health2.status).toBe(200);

      // デバイス1からログアウト
      const logoutResponse = await request
        .post('/api/auth/logout')
        .set(device1Headers)
        .send({
          refreshToken: scenario.tokens.refreshToken,
        });

      expect(logoutResponse.status).toBe(200);

      // デバイス1はアクセスできない（認証が必要なエンドポイントでテスト）
      const device1AfterLogoutResponse = await request
        .get(`/api/users/${scenario.user.id}/profile`)
        .set(device1Headers);

      expect(device1AfterLogoutResponse.status).toBe(401);

      // デバイス2は依然としてアクセスできる
      const device2AfterLogoutResponse = await request
        .get(`/api/users/${scenario.user.id}/profile`)
        .set(device2Headers);

      expect(device2AfterLogoutResponse.status).toBe(200);

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('複数デバイスでデータ変更が同期されること', async () => {
      // 複数デバイスでログインしたユーザーシナリオを作成
      const scenario = await createCompleteUserScenario({
        email: 'datasync@example.com',
        password: 'DataSync123',
        taskListName: 'マルチデバイステスト',
      });

      // デバイス2からログイン
      const device2Data = {
        email: 'datasync@example.com',
        password: 'DataSync123',
        deviceId: generateUniqueUserData().deviceId,
      };

      const device2LoginResponse = await request
        .post('/api/auth/login')
        .send(device2Data);

      const device2Tokens = device2LoginResponse.body.data;

      const device1Headers = generateAuthHeader(scenario.tokens.token);
      const device2Headers = generateAuthHeader(device2Tokens.token);

      // デバイス1でタスクを追加
      const addTaskResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/tasks`)
        .set(device1Headers)
        .send({
          text: generateUniqueTaskText('デバイス1からのタスク'),
        });

      expect(addTaskResponse.status).toBe(201);
      const newTask = addTaskResponse.body.data.task;

      // デバイス2で同じタスクリストを取得
      const getTasksResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/tasks`)
        .set(device2Headers);

      expect(getTasksResponse.status).toBe(200);
      const tasks = getTasksResponse.body.data.tasks;
      
      // デバイス1で追加したタスクがデバイス2で見えることを確認
      const addedTaskOnDevice2 = tasks.find((task: any) => task.id === newTask.id);
      expect(addedTaskOnDevice2).toBeDefined();
      expect(addedTaskOnDevice2.text).toBe(newTask.text);

      // デバイス2でタスクを更新
      const updateTaskResponse = await request
        .put(`/api/tasks/${newTask.id}`)
        .set(device2Headers)
        .send({
          text: 'デバイス2で更新されたタスク',
          completed: true,
        });

      expect(updateTaskResponse.status).toBe(200);

      // デバイス1で更新されたタスクを確認
      const getUpdatedTasksResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/tasks`)
        .set(device1Headers);

      expect(getUpdatedTasksResponse.status).toBe(200);
      const updatedTasks = getUpdatedTasksResponse.body.data.tasks;
      
      const updatedTaskOnDevice1 = updatedTasks.find((task: any) => task.id === newTask.id);
      expect(updatedTaskOnDevice1.text).toBe('デバイス2で更新されたタスク');
      expect(updatedTaskOnDevice1.completed).toBe(true);

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('複数デバイスで設定変更が同期されること', async () => {
      // 複数デバイスでログインしたユーザーを作成
      const authUser = await createAuthenticatedUser({
        email: 'settingsync@example.com',
        password: 'SettingSync123',
      });

      const device2Data = {
        email: 'settingsync@example.com',
        password: 'SettingSync123',
        deviceId: generateUniqueUserData().deviceId,
      };

      const device2LoginResponse = await request
        .post('/api/auth/login')
        .send(device2Data);

      const device2Tokens = device2LoginResponse.body.data;

      const device1Headers = generateAuthHeader(authUser.tokens.token);
      const device2Headers = generateAuthHeader(device2Tokens.token);

      // デバイス1で設定を変更
      const updateSettingsResponse = await request
        .put(`/api/users/${authUser.user.id}/settings`)
        .set(device1Headers)
        .send({
          theme: 'dark',
          language: 'en',
        });

      expect(updateSettingsResponse.status).toBe(200);

      // デバイス2で設定を確認
      const getSettingsResponse = await request
        .get(`/api/users/${authUser.user.id}/settings`)
        .set(device2Headers);

      expect(getSettingsResponse.status).toBe(200);
      const settings = getSettingsResponse.body.data.settings;
      expect(settings.theme).toBe('dark');
      expect(settings.language).toBe('en');

      // デバイス2でApp設定を変更
      const updateAppResponse = await request
        .put(`/api/users/${authUser.user.id}/app`)
        .set(device2Headers)
        .send({
          taskInsertPosition: 'bottom',
          autoSort: true,
        });

      expect(updateAppResponse.status).toBe(200);

      // デバイス1でApp設定を確認
      const getAppResponse = await request
        .get(`/api/users/${authUser.user.id}/app`)
        .set(device1Headers);

      expect(getAppResponse.status).toBe(200);
      const appSettings = getAppResponse.body.data.app;
      expect(appSettings.taskInsertPosition).toBe('bottom');
      expect(appSettings.autoSort).toBe(true);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('セキュリティと同期', () => {
    it('デバイス別トークンの独立性を確保すること', async () => {
      const authUser = await createAuthenticatedUser({
        email: 'tokensecurity@example.com',
        password: 'TokenSecurity123',
      });

      // 複数デバイスを作成
      const devices = await createMultipleDevicesForUser(authUser.user, 3);

      // 各デバイスのトークンが異なることを確認
      const allTokens = [authUser.tokens.token, ...devices.map(d => d.tokens.token)];
      const uniqueTokens = new Set(allTokens);
      expect(uniqueTokens.size).toBe(allTokens.length);

      const allRefreshTokens = [authUser.tokens.refreshToken, ...devices.map(d => d.tokens.refreshToken)];
      const uniqueRefreshTokens = new Set(allRefreshTokens);
      expect(uniqueRefreshTokens.size).toBe(allRefreshTokens.length);

      // 一つのトークンを無効化
      await prisma.refreshToken.updateMany({
        where: { 
          userId: authUser.user.id,
          deviceId: devices[0]?.deviceId,
        },
        data: { isActive: false },
      });

      // 無効化されたデバイスはアクセスできない（認証が必要なエンドポイントでテスト）
      const invalidDeviceHeaders = generateAuthHeader(devices[0]?.tokens.token || '');
      const invalidAccessResponse = await request
        .get(`/api/users/${authUser.user.id}/profile`)
        .set(invalidDeviceHeaders);

      expect(invalidAccessResponse.status).toBe(401);

      // 他のデバイスは依然としてアクセスできる
      const validDeviceHeaders = generateAuthHeader(devices[1]?.tokens.token || '');
      const validAccessResponse = await request
        .get(`/api/users/${authUser.user.id}/profile`)
        .set(validDeviceHeaders);

      expect(validAccessResponse.status).toBe(200);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('不正なデバイスIDでの操作を防ぐこと', async () => {
      const authUser = await createAuthenticatedUser({
        email: 'invaliddevice@example.com',
        password: 'InvalidDevice123',
      });

      // 正しいリフレッシュトークンだが間違ったデバイスIDでリフレッシュを試行
      const wrongDeviceRefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: authUser.tokens.refreshToken,
          deviceId: generateUniqueUserData().deviceId, // 間違ったデバイスID
        });

      expect(wrongDeviceRefreshResponse.status).toBe(401);

      // 無効な形式のデバイスIDでログインを試行
      const wrongDeviceLoginResponse = await request
        .post('/api/auth/login')
        .send({
          email: 'invaliddevice@example.com',
          password: 'InvalidDevice123',
          deviceId: 'non-existent-device-id', // 32文字未満なので無効
        });

      // デバイスIDが無効なので400エラーが返される
      expect(wrongDeviceLoginResponse.status).toBe(400);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('エラーハンドリング', () => {
    it('削除されたデバイスでの操作エラーを処理すること', async () => {
      const authUser = await createAuthenticatedUser({
        email: 'deleteddevice@example.com',
        password: 'DeletedDevice123',
      });

      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // 初期状態ではアクセスできる
      const initialAccessResponse = await request
        .get('/health')
        .set(authHeaders);

      expect(initialAccessResponse.status).toBe(200);

      // リフレッシュトークンを手動で非アクティブ化
      await prisma.refreshToken.updateMany({
        where: { 
          userId: authUser.user.id,
          deviceId: authUser.deviceId,
        },
        data: { isActive: false },
      });

      // アクセスが拒否されることを確認（認証が必要なエンドポイントでテスト）
      const deniedAccessResponse = await request
        .get(`/api/users/${authUser.user.id}/profile`)
        .set(authHeaders);

      expect(deniedAccessResponse.status).toBe(401);

      // リフレッシュも失敗することを確認
      const failedRefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: authUser.tokens.refreshToken,
          deviceId: authUser.deviceId,
        });

      expect(failedRefreshResponse.status).toBe(401);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('期限切れトークンの処理を確認すること', async () => {
      const authUser = await createAuthenticatedUser({
        email: 'expiredtoken@example.com',
        password: 'ExpiredToken123',
      });

      // リフレッシュトークンの期限を過去に設定
      await prisma.refreshToken.updateMany({
        where: { 
          userId: authUser.user.id,
          deviceId: authUser.deviceId,
        },
        data: { 
          expiresAt: new Date(Date.now() - 1000), // 1秒前に期限切れ
        },
      });

      // 期限切れトークンでのリフレッシュは失敗するはず
      const expiredRefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: authUser.tokens.refreshToken,
          deviceId: authUser.deviceId,
        });

      expect(expiredRefreshResponse.status).toBe(401);

      // 再ログインは可能
      const reLoginResponse = await request
        .post('/api/auth/login')
        .send({
          email: 'expiredtoken@example.com',
          password: 'ExpiredToken123',
          deviceId: authUser.deviceId,
        });

      expect(reLoginResponse.status).toBe(200);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('パフォーマンステスト', () => {
    it('多数のデバイスでの同時操作を効率的に処理すること', async () => {
      const authUser = await createAuthenticatedUser({
        email: 'performance@example.com',
        password: 'Performance123',
      });

      // 最大数のデバイスを作成
      const devices = await createMultipleDevicesForUser(authUser.user, 4); // +初期デバイス = 5台

      // 全デバイスで段階的にAPIアクセス（ECONNRESET回避）
      const allDeviceHeaders = [
        generateAuthHeader(authUser.tokens.token),
        ...devices.map(device => generateAuthHeader(device.tokens.token)),
      ];

      const startTime = Date.now();

      // 同時リクエスト数を制限して段階的に実行
      const responses = [];
      for (let i = 0; i < allDeviceHeaders.length; i += 2) {
        const batch = allDeviceHeaders.slice(i, i + 2);
        const batchRequests = batch.map(headers =>
          request.get('/health').set(headers)
        );
        const batchResponses = await Promise.all(batchRequests);
        responses.push(...batchResponses);
        // 短い待機でサーバー負荷を軽減
        if (i + 2 < allDeviceHeaders.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      const endTime = Date.now();

      // 全てのリクエストが成功
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // 合理的な応答時間（5秒未満、段階的実行のため余裕を持たせる）
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(5000);

      // 全デバイスで段階的にリフレッシュトークン更新（ECONNRESET回避）
      const refreshStartTime = Date.now();

      const refreshRequestData = [
        {
          refreshToken: authUser.tokens.refreshToken,
          deviceId: authUser.deviceId,
        },
        ...devices.map(device => ({
          refreshToken: device.tokens.refreshToken,
          deviceId: device.deviceId,
        })),
      ];

      // 同時リクエスト数を制限して段階的に実行
      const refreshResponses = [];
      for (let i = 0; i < refreshRequestData.length; i += 2) {
        const batch = refreshRequestData.slice(i, i + 2);
        const batchRequests = batch.map(data =>
          request.post('/api/auth/refresh').send(data)
        );
        const batchResponses = await Promise.all(batchRequests);
        refreshResponses.push(...batchResponses);
        // 短い待機でサーバー負荷を軽減
        if (i + 2 < refreshRequestData.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      const refreshEndTime = Date.now();

      // 全てのリフレッシュが成功
      for (const response of refreshResponses) {
        expect(response.status).toBe(200);
      }

      // 合理的な応答時間（8秒未満、段階的実行のため余裕を持たせる）
      const refreshResponseTime = refreshEndTime - refreshStartTime;
      expect(refreshResponseTime).toBeLessThan(8000);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });
});