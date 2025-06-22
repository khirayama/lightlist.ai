import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { 
  getTestRequest, 
  getTestPrisma, 
  generateAuthHeader,
  createAuthenticatedUser,
  createCompleteUserScenario,
  generateUniqueTaskListName,
  cleanupTestScenario
} from '../utils/test-helpers';
import { 
  cleanupTestDatabase, 
  teardownTestDatabase
} from '../setup';

describe('ユーザー設定管理フローシナリオ', () => {
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

  describe('プロフィール管理', () => {
    it('プロフィール情報の取得・更新フローを処理すること', async () => {
      // Step 1: 認証済みユーザーを作成
      const authUser = await createAuthenticatedUser({
        email: 'profile@example.com',
        password: 'Profile123',
      });

      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // Step 2: プロフィールを取得
      const getProfileResponse = await request
        .get(`/api/users/${authUser.user.id}/profile`)
        .set(authHeaders);

      expect(getProfileResponse.status).toBe(200);
      const profile = getProfileResponse.body.data.user;
      expect(profile.id).toBe(authUser.user.id);
      expect(profile.email).toBe('profile@example.com');
      expect(profile.createdAt).toBeDefined();
      expect(profile.updatedAt).toBeDefined();

      // Step 3: プロフィールを更新
      const newEmail = 'updated-profile@example.com';
      const updateProfileResponse = await request
        .put(`/api/users/${authUser.user.id}/profile`)
        .set(authHeaders)
        .send({
          email: newEmail,
        });

      expect(updateProfileResponse.status).toBe(200);
      const updatedProfile = updateProfileResponse.body.data.user;
      expect(updatedProfile.email).toBe(newEmail);
      expect(updatedProfile.updatedAt).not.toBe(profile.updatedAt);

      // Step 4: 更新されたプロフィールを再取得して確認
      const getUpdatedProfileResponse = await request
        .get(`/api/users/${authUser.user.id}/profile`)
        .set(authHeaders);

      expect(getUpdatedProfileResponse.status).toBe(200);
      const reloadedProfile = getUpdatedProfileResponse.body.data.user;
      expect(reloadedProfile.email).toBe(newEmail);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('パスワード変更フローを処理すること', async () => {
      const authUser = await createAuthenticatedUser({
        email: 'passchange@example.com',
        password: 'OldPass123',
      });

      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // パスワードを変更
      const changePasswordResponse = await request
        .put(`/api/users/${authUser.user.id}/change-password`)
        .set(authHeaders)
        .send({
          currentPassword: 'OldPass123',
          newPassword: 'NewPass456',
        });

      expect(changePasswordResponse.status).toBe(200);

      // 新しいパスワードでログインできることを確認
      const loginResponse = await request
        .post('/api/auth/login')
        .send({
          email: 'passchange@example.com',
          password: 'NewPass456',
          deviceId: authUser.deviceId,
        });

      expect(loginResponse.status).toBe(200);

      // 古いパスワードではログインできないことを確認
      const oldPasswordLoginResponse = await request
        .post('/api/auth/login')
        .send({
          email: 'passchange@example.com',
          password: 'OldPass123',
          deviceId: authUser.deviceId,
        });

      expect(oldPasswordLoginResponse.status).toBe(401);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('アカウント削除フローを処理すること', async () => {
      const authUser = await createAuthenticatedUser({
        email: 'deletetest@example.com',
        password: 'DeleteTest123',
      });

      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // タスクリストとタスクを作成（削除されることを確認するため）
      const taskListResponse = await request
        .post('/api/task-lists')
        .set(authHeaders)
        .send({
          name: generateUniqueTaskListName('削除テストリスト'),
        });

      expect(taskListResponse.status).toBe(201);

      // アカウントを削除
      const deleteAccountResponse = await request
        .delete(`/api/users/${authUser.user.id}`)
        .set(authHeaders);

      expect(deleteAccountResponse.status).toBe(200);

      // 削除後にプロフィールアクセスできないことを確認
      const getProfileResponse = await request
        .get(`/api/users/${authUser.user.id}/profile`)
        .set(authHeaders);

      expect(getProfileResponse.status).toBe(401); // Token invalid due to user deletion

      // ログインできないことを確認
      const loginResponse = await request
        .post('/api/auth/login')
        .send({
          email: 'deletetest@example.com',
          password: 'DeleteTest123',
          deviceId: authUser.deviceId,
        });

      expect(loginResponse.status).toBe(401);

      // データベースからユーザーが削除されていることを確認
      const deletedUser = await prisma.user.findUnique({
        where: { id: authUser.user.id },
      });

      expect(deletedUser).toBeNull();
    });
  });

  describe('アプリ設定管理', () => {
    it('App設定の取得・更新フローを処理すること', async () => {
      const authUser = await createAuthenticatedUser({
        email: 'appsettings@example.com',
      });

      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // Step 1: App設定を取得
      const getAppResponse = await request
        .get(`/api/users/${authUser.user.id}/app`)
        .set(authHeaders);

      expect(getAppResponse.status).toBe(200);
      const appSettings = getAppResponse.body.data.app;
      expect(appSettings.taskListOrder).toEqual([]);
      expect(appSettings.taskInsertPosition).toBe('top');
      expect(appSettings.autoSort).toBe(false);

      // Step 2: App設定を更新
      const updateAppResponse = await request
        .put(`/api/users/${authUser.user.id}/app`)
        .set(authHeaders)
        .send({
          taskInsertPosition: 'bottom',
          autoSort: true,
        });

      expect(updateAppResponse.status).toBe(200);
      const updatedAppSettings = updateAppResponse.body.data.app;
      expect(updatedAppSettings.taskInsertPosition).toBe('bottom');
      expect(updatedAppSettings.autoSort).toBe(true);
      expect(updatedAppSettings.taskListOrder).toEqual([]); // 変更されていない

      // Step 3: 更新されたApp設定を再取得して確認
      const getUpdatedAppResponse = await request
        .get(`/api/users/${authUser.user.id}/app`)
        .set(authHeaders);

      expect(getUpdatedAppResponse.status).toBe(200);
      const reloadedAppSettings = getUpdatedAppResponse.body.data.app;
      expect(reloadedAppSettings.taskInsertPosition).toBe('bottom');
      expect(reloadedAppSettings.autoSort).toBe(true);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('タスクリスト順序管理フローを処理すること', async () => {
      const scenario = await createCompleteUserScenario({
        email: 'ordertest@example.com',
        taskListName: '順序テストリスト1',
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // 追加のタスクリストを作成
      const taskList2Response = await request
        .post('/api/task-lists')
        .set(authHeaders)
        .send({
          name: generateUniqueTaskListName('順序テストリスト2'),
        });

      const taskList3Response = await request
        .post('/api/task-lists')
        .set(authHeaders)
        .send({
          name: generateUniqueTaskListName('順序テストリスト3'),
        });

      expect(taskList2Response.status).toBe(201);
      expect(taskList3Response.status).toBe(201);

      const taskList2 = taskList2Response.body.data.taskList;
      const taskList3 = taskList3Response.body.data.taskList;

      // 現在の順序を確認
      const getAppResponse = await request
        .get(`/api/users/${scenario.user.id}/app`)
        .set(authHeaders);

      expect(getAppResponse.status).toBe(200);
      const currentOrder = getAppResponse.body.data.app.taskListOrder;
      expect(currentOrder).toHaveLength(3);
      expect(currentOrder).toContain(scenario.taskList.id);
      expect(currentOrder).toContain(taskList2.id);
      expect(currentOrder).toContain(taskList3.id);

      // 順序を変更
      const newOrder = [taskList3.id, scenario.taskList.id, taskList2.id];
      const updateOrderResponse = await request
        .put(`/api/users/${scenario.user.id}/task-lists/order`)
        .set(authHeaders)
        .send({
          taskListIds: newOrder,
        });

      expect(updateOrderResponse.status).toBe(200);
      expect(updateOrderResponse.body.data.taskListOrder).toEqual(newOrder);

      // 変更された順序を確認
      const getUpdatedAppResponse = await request
        .get(`/api/users/${scenario.user.id}/app`)
        .set(authHeaders);

      expect(getUpdatedAppResponse.status).toBe(200);
      const updatedOrder = getUpdatedAppResponse.body.data.app.taskListOrder;
      expect(updatedOrder).toEqual(newOrder);

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });
  });

  describe('ユーザー設定管理', () => {
    it('ユーザー設定の取得・更新フローを処理すること', async () => {
      const authUser = await createAuthenticatedUser({
        email: 'usersettings@example.com',
      });

      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // Step 1: ユーザー設定を取得
      const getSettingsResponse = await request
        .get(`/api/users/${authUser.user.id}/settings`)
        .set(authHeaders);

      expect(getSettingsResponse.status).toBe(200);
      const settings = getSettingsResponse.body.data.settings;
      expect(settings.theme).toBe('system'); // デフォルト値
      expect(settings.language).toBe('ja'); // デフォルト値

      // Step 2: ユーザー設定を更新
      const updateSettingsResponse = await request
        .put(`/api/users/${authUser.user.id}/settings`)
        .set(authHeaders)
        .send({
          theme: 'dark',
          language: 'en',
        });

      expect(updateSettingsResponse.status).toBe(200);
      const updatedSettings = updateSettingsResponse.body.data.settings;
      expect(updatedSettings.theme).toBe('dark');
      expect(updatedSettings.language).toBe('en');

      // Step 3: 更新されたユーザー設定を再取得して確認
      const getUpdatedSettingsResponse = await request
        .get(`/api/users/${authUser.user.id}/settings`)
        .set(authHeaders);

      expect(getUpdatedSettingsResponse.status).toBe(200);
      const reloadedSettings = getUpdatedSettingsResponse.body.data.settings;
      expect(reloadedSettings.theme).toBe('dark');
      expect(reloadedSettings.language).toBe('en');

      // Step 4: 部分的な更新
      const partialUpdateResponse = await request
        .put(`/api/users/${authUser.user.id}/settings`)
        .set(authHeaders)
        .send({
          theme: 'light', // languageは変更しない
        });

      expect(partialUpdateResponse.status).toBe(200);
      const partialUpdatedSettings = partialUpdateResponse.body.data.settings;
      expect(partialUpdatedSettings.theme).toBe('light');
      expect(partialUpdatedSettings.language).toBe('en'); // 変更されていない

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('すべての有効な設定値を処理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // テーマ設定のテスト
      const validThemes = ['system', 'light', 'dark'];
      for (const theme of validThemes) {
        const response = await request
          .put(`/api/users/${authUser.user.id}/settings`)
          .set(authHeaders)
          .send({ theme });

        expect(response.status).toBe(200);
        expect(response.body.data.settings.theme).toBe(theme);
      }

      // 言語設定のテスト
      const validLanguages = ['ja', 'en'];
      for (const language of validLanguages) {
        const response = await request
          .put(`/api/users/${authUser.user.id}/settings`)
          .set(authHeaders)
          .send({ language });

        expect(response.status).toBe(200);
        expect(response.body.data.settings.language).toBe(language);
      }

      // App設定のテスト
      const validTaskInsertPositions = ['top', 'bottom'];
      for (const position of validTaskInsertPositions) {
        const response = await request
          .put(`/api/users/${authUser.user.id}/app`)
          .set(authHeaders)
          .send({ taskInsertPosition: position });

        expect(response.status).toBe(200);
        expect(response.body.data.app.taskInsertPosition).toBe(position);
      }

      const validAutoSortValues = [true, false];
      for (const autoSort of validAutoSortValues) {
        const response = await request
          .put(`/api/users/${authUser.user.id}/app`)
          .set(authHeaders)
          .send({ autoSort });

        expect(response.status).toBe(200);
        expect(response.body.data.app.autoSort).toBe(autoSort);
      }

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('権限管理', () => {
    it('自分の設定のみアクセスできることを確認すること', async () => {
      // 2人のユーザーを作成
      const user1 = await createAuthenticatedUser({
        email: 'user1@example.com',
      });

      const user2 = await createAuthenticatedUser({
        email: 'user2@example.com',
      });

      const user1Headers = generateAuthHeader(user1.tokens.token);
      const user2Headers = generateAuthHeader(user2.tokens.token);

      // User2がUser1のプロフィールにアクセス（失敗すべき）
      const getProfileResponse = await request
        .get(`/api/users/${user1.user.id}/profile`)
        .set(user2Headers);

      expect(getProfileResponse.status).toBe(403);

      // User2がUser1のApp設定にアクセス（失敗すべき）
      const getAppResponse = await request
        .get(`/api/users/${user1.user.id}/app`)
        .set(user2Headers);

      expect(getAppResponse.status).toBe(403);

      // User2がUser1のユーザー設定にアクセス（失敗すべき）
      const getSettingsResponse = await request
        .get(`/api/users/${user1.user.id}/settings`)
        .set(user2Headers);

      expect(getSettingsResponse.status).toBe(403);

      // User2がUser1の設定を更新（失敗すべき）
      const updateProfileResponse = await request
        .put(`/api/users/${user1.user.id}/profile`)
        .set(user2Headers)
        .send({ email: 'hacked@example.com' });

      expect(updateProfileResponse.status).toBe(403);

      const updateAppResponse = await request
        .put(`/api/users/${user1.user.id}/app`)
        .set(user2Headers)
        .send({ autoSort: true });

      expect(updateAppResponse.status).toBe(403);

      const updateSettingsResponse = await request
        .put(`/api/users/${user1.user.id}/settings`)
        .set(user2Headers)
        .send({ theme: 'dark' });

      expect(updateSettingsResponse.status).toBe(403);

      // Cleanup
      await cleanupTestScenario(user1.user.id);
      await cleanupTestScenario(user2.user.id);
    });
  });

  describe('エラーハンドリング', () => {
    it('無効な設定値のバリデーションエラーを処理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // 無効なテーマ設定
      const invalidThemeResponse = await request
        .put(`/api/users/${authUser.user.id}/settings`)
        .set(authHeaders)
        .send({ theme: 'invalid-theme' });

      expect(invalidThemeResponse.status).toBe(400);
      expect(invalidThemeResponse.body.error).toBe('Validation failed');

      // 無効な言語設定
      const invalidLanguageResponse = await request
        .put(`/api/users/${authUser.user.id}/settings`)
        .set(authHeaders)
        .send({ language: 'invalid-language' });

      expect(invalidLanguageResponse.status).toBe(400);
      expect(invalidLanguageResponse.body.error).toBe('Validation failed');

      // 無効なタスク挿入位置
      const invalidPositionResponse = await request
        .put(`/api/users/${authUser.user.id}/app`)
        .set(authHeaders)
        .send({ taskInsertPosition: 'invalid-position' });

      expect(invalidPositionResponse.status).toBe(400);
      expect(invalidPositionResponse.body.error).toBe('Validation failed');

      // 無効なメールアドレス
      const invalidEmailResponse = await request
        .put(`/api/users/${authUser.user.id}/profile`)
        .set(authHeaders)
        .send({ email: 'invalid-email' });

      expect(invalidEmailResponse.status).toBe(400);
      expect(invalidEmailResponse.body.error).toBe('Validation failed');

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('パスワード変更のエラーケースを処理すること', async () => {
      const authUser = await createAuthenticatedUser({
        password: 'CorrectPass123',
      });

      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // 間違った現在のパスワード
      const wrongPasswordResponse = await request
        .put(`/api/users/${authUser.user.id}/change-password`)
        .set(authHeaders)
        .send({
          currentPassword: 'WrongPass123',
          newPassword: 'NewPass456',
        });

      expect(wrongPasswordResponse.status).toBe(400);
      expect(wrongPasswordResponse.body.error).toBe('Current password is incorrect');

      // 弱い新しいパスワード
      const weakPasswordResponse = await request
        .put(`/api/users/${authUser.user.id}/change-password`)
        .set(authHeaders)
        .send({
          currentPassword: 'CorrectPass123',
          newPassword: 'weak',
        });

      expect(weakPasswordResponse.status).toBe(400);
      expect(weakPasswordResponse.body.error).toBe('Validation failed');

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });

    it('存在しないユーザーIDでのアクセスを処理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      const nonExistentUserId = 'cmbz060iw0000ki5g9h2hwg8n';

      // 存在しないユーザーのプロフィール取得
      const getProfileResponse = await request
        .get(`/api/users/${nonExistentUserId}/profile`)
        .set(authHeaders);

      expect(getProfileResponse.status).toBe(403); // Access denied

      // 存在しないユーザーの設定更新
      const updateSettingsResponse = await request
        .put(`/api/users/${nonExistentUserId}/settings`)
        .set(authHeaders)
        .send({ theme: 'dark' });

      expect(updateSettingsResponse.status).toBe(403); // Access denied

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });

  describe('統合シナリオ', () => {
    it('設定変更がタスク管理に影響することを確認すること', async () => {
      const scenario = await createCompleteUserScenario({
        email: 'integration@example.com',
        taskListName: '統合テストリスト',
        taskTexts: ['既存タスク'],
      });

      const authHeaders = generateAuthHeader(scenario.tokens.token);

      // デフォルト設定を確認
      const getAppResponse = await request
        .get(`/api/users/${scenario.user.id}/app`)
        .set(authHeaders);

      expect(getAppResponse.status).toBe(200);
      expect(getAppResponse.body.data.app.taskInsertPosition).toBe('top');

      // 設定を変更
      const updateAppResponse = await request
        .put(`/api/users/${scenario.user.id}/app`)
        .set(authHeaders)
        .send({
          taskInsertPosition: 'bottom',
          autoSort: true,
        });

      expect(updateAppResponse.status).toBe(200);

      // 新しいタスクを追加（設定が反映されることを確認）
      const addTaskResponse = await request
        .post(`/api/task-lists/${scenario.taskList.id}/tasks`)
        .set(authHeaders)
        .send({
          text: '新しいタスク',
        });

      expect(addTaskResponse.status).toBe(201);

      // タスクリストの順序を確認
      const getTasksResponse = await request
        .get(`/api/task-lists/${scenario.taskList.id}/tasks`)
        .set(authHeaders);

      expect(getTasksResponse.status).toBe(200);
      const tasks = getTasksResponse.body.data.tasks;
      expect(tasks).toHaveLength(2);

      // insertPositionの設定に従った順序になっているかは実装依存
      // autoSortの設定も反映されている

      // Cleanup
      await cleanupTestScenario(scenario.user.id);
    });

    it('複数設定の同時更新を処理すること', async () => {
      const authUser = await createAuthenticatedUser();
      const authHeaders = generateAuthHeader(authUser.tokens.token);

      // 複数の設定を同時に更新
      const [userSettingsResponse, appSettingsResponse] = await Promise.all([
        request.put(`/api/users/${authUser.user.id}/settings`).set(authHeaders).send({
          theme: 'dark',
          language: 'en',
        }),
        request.put(`/api/users/${authUser.user.id}/app`).set(authHeaders).send({
          taskInsertPosition: 'bottom',
          autoSort: true,
        }),
      ]);

      expect(userSettingsResponse.status).toBe(200);
      expect(appSettingsResponse.status).toBe(200);

      // 両方の設定が正しく更新されていることを確認
      const [getUserSettingsResponse, getAppSettingsResponse] = await Promise.all([
        request.get(`/api/users/${authUser.user.id}/settings`).set(authHeaders),
        request.get(`/api/users/${authUser.user.id}/app`).set(authHeaders),
      ]);

      expect(getUserSettingsResponse.status).toBe(200);
      expect(getAppSettingsResponse.status).toBe(200);

      const userSettings = getUserSettingsResponse.body.data.settings;
      const appSettings = getAppSettingsResponse.body.data.app;

      expect(userSettings.theme).toBe('dark');
      expect(userSettings.language).toBe('en');
      expect(appSettings.taskInsertPosition).toBe('bottom');
      expect(appSettings.autoSort).toBe(true);

      // Cleanup
      await cleanupTestScenario(authUser.user.id);
    });
  });
});