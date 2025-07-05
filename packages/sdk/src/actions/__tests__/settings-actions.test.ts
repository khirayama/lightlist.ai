import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsActions } from '../index';
import { SettingsActionsImpl } from '../implementation/settings-actions';
import { 
  setupActionsTests, 
  mockSettingsService, 
  mockStore, 
  mockUserSettings, 
  mockAppSettings,
  mockAppError,
  expectActionSuccess,
  expectActionFailure,
  createApiResponse
} from './setup';

describe('SettingsActions', () => {
  let settingsActions: SettingsActions;

  setupActionsTests();

  beforeEach(() => {
    settingsActions = new SettingsActionsImpl(mockSettingsService, mockStore);
  });

  describe('getSettings', () => {
    it('ユーザー設定を取得してストアに保存する', async () => {
      // Arrange
      mockSettingsService.getSettings.mockResolvedValue(createApiResponse(mockUserSettings));

      // Act
      const result = await settingsActions.getSettings();

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(mockUserSettings);
      
      // SettingsService が正しく呼び出されたか確認
      expect(mockSettingsService.getSettings).toHaveBeenCalledTimes(1);
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('サービスエラーの場合、エラーを返す', async () => {
      // Arrange
      mockSettingsService.getSettings.mockRejectedValue(
        new Error('Failed to fetch settings')
      );

      // Act
      const result = await settingsActions.getSettings();

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('network');
      expect(error.message).toContain('Failed to fetch settings');
    });
  });

  describe('updateSettings', () => {
    it('ユーザー設定を更新してストアに反映する', async () => {
      // Arrange
      const updates = { theme: 'dark' as const };
      const updatedSettings = { ...mockUserSettings, ...updates };
      mockSettingsService.updateSettings.mockResolvedValue(createApiResponse(updatedSettings));

      // Act
      const result = await settingsActions.updateSettings(updates);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(updatedSettings);
      
      // SettingsService が正しく呼び出されたか確認
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith(updates);
      expect(mockSettingsService.updateSettings).toHaveBeenCalledTimes(1);
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('バリデーションエラーの場合、エラーを返す', async () => {
      // Arrange
      const updates = { theme: 'invalid-theme' as any };
      const validationError = new Error('Invalid theme value');
      (validationError as any).status = 400;
      mockSettingsService.updateSettings.mockRejectedValue(validationError);

      // Act
      const result = await settingsActions.updateSettings(updates);

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('validation');
      expect(error.message).toContain('Invalid theme value');
      
      // Store が更新されていないか確認
      expect(mockStore.setState).not.toHaveBeenCalled();
    });
  });

  describe('getApp', () => {
    it('アプリ設定を取得してストアに保存する', async () => {
      // Arrange
      mockSettingsService.getApp.mockResolvedValue(createApiResponse(mockAppSettings));

      // Act
      const result = await settingsActions.getApp();

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(mockAppSettings);
      
      // SettingsService が正しく呼び出されたか確認
      expect(mockSettingsService.getApp).toHaveBeenCalledTimes(1);
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('サービスエラーの場合、エラーを返す', async () => {
      // Arrange
      mockSettingsService.getApp.mockRejectedValue(
        new Error('Failed to fetch app settings')
      );

      // Act
      const result = await settingsActions.getApp();

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('network');
      expect(error.message).toContain('Failed to fetch app settings');
    });
  });

  describe('updateApp', () => {
    it('アプリ設定を更新してストアに反映する', async () => {
      // Arrange
      const updates = { taskInsertPosition: 'bottom' as const };
      const updatedApp = { ...mockAppSettings, ...updates };
      mockSettingsService.updateApp.mockResolvedValue(createApiResponse(updatedApp));

      // Act
      const result = await settingsActions.updateApp(updates);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(updatedApp);
      
      // SettingsService が正しく呼び出されたか確認
      expect(mockSettingsService.updateApp).toHaveBeenCalledWith(updates);
      expect(mockSettingsService.updateApp).toHaveBeenCalledTimes(1);
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('バリデーションエラーの場合、エラーを返す', async () => {
      // Arrange
      const updates = { taskInsertPosition: 'invalid-position' as any };
      const validationError = new Error('Invalid task insert position');
      (validationError as any).status = 400;
      mockSettingsService.updateApp.mockRejectedValue(validationError);

      // Act
      const result = await settingsActions.updateApp(updates);

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('validation');
      expect(error.message).toContain('Invalid task insert position');
      
      // Store が更新されていないか確認
      expect(mockStore.setState).not.toHaveBeenCalled();
    });
  });

  describe('updateTaskListOrder', () => {
    it('タスクリストの順序を更新する', async () => {
      // Arrange
      const newOrder = ['list1', 'list2', 'list3'];
      mockSettingsService.updateTaskListOrder.mockResolvedValue(undefined);

      // Act
      const result = await settingsActions.updateTaskListOrder(newOrder);

      // Assert
      expectActionSuccess(result);
      
      // SettingsService が正しく呼び出されたか確認
      expect(mockSettingsService.updateTaskListOrder).toHaveBeenCalledWith(newOrder);
      expect(mockSettingsService.updateTaskListOrder).toHaveBeenCalledTimes(1);
      
      // Store のタスクリストが並び替えられているか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('無効な順序の場合、エラーを返す', async () => {
      // Arrange
      const invalidOrder = ['non-existent-list'];
      const validationError = new Error('Invalid task list order');
      (validationError as any).status = 400;
      mockSettingsService.updateTaskListOrder.mockRejectedValue(validationError);

      // Act
      const result = await settingsActions.updateTaskListOrder(invalidOrder);

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('validation');
      expect(error.message).toContain('Invalid task list order');
      
      // Store が更新されていないか確認
      expect(mockStore.setState).not.toHaveBeenCalled();
    });
  });
});