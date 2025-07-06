import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsService } from '../index';
import { SettingsServiceImpl } from '../settings.service';
import { setupServiceTests, mockHttpClient, TEST_BASE_URL } from './setup';
import { UserSettings, AppSettings } from '../types';

describe('SettingsService', () => {
  let settingsService: SettingsService;

  setupServiceTests();

  beforeEach(() => {
    settingsService = new SettingsServiceImpl(mockHttpClient, TEST_BASE_URL);
  });

  describe('ユーザー設定管理', () => {
    const mockUserSettings: UserSettings = {
      theme: 'dark',
      language: 'ja'
    };

    describe('getSettings', () => {
      it('ユーザー設定の取得が成功する', async () => {
        // Arrange
        mockHttpClient.get.mockResolvedValue({
          data: mockUserSettings,
          message: 'Settings retrieved successfully'
        });

        // Act
        const result = await settingsService.getSettings();

        // Assert
        expect(result.data).toEqual(mockUserSettings);
        expect(result.message).toBe('Settings retrieved successfully');
        expect(mockHttpClient.get).toHaveBeenCalledWith('/settings');
      });

      it('サーバーエラーでエラーが発生する', async () => {
        // Arrange
        mockHttpClient.get.mockRejectedValue(new Error('Server error'));

        // Act & Assert
        await expect(settingsService.getSettings()).rejects.toThrow('Server error');
      });
    });

    describe('updateSettings', () => {
      it('ユーザー設定の更新が成功する', async () => {
        // Arrange
        const updateData: Partial<UserSettings> = {
          theme: 'light'
        };
        const updatedSettings: UserSettings = {
          ...mockUserSettings,
          theme: 'light'
        };

        mockHttpClient.put.mockResolvedValue({
          data: updatedSettings,
          message: 'Settings updated successfully'
        });

        // Act
        const result = await settingsService.updateSettings(updateData);

        // Assert
        expect(result.data).toEqual(updatedSettings);
        expect(result.message).toBe('Settings updated successfully');
        expect(mockHttpClient.put).toHaveBeenCalledWith('/settings', updateData);
      });

      it('無効なテーマ設定でバリデーションエラーが発生する', async () => {
        // Arrange
        const updateData = {
          theme: 'invalid-theme' as any
        };

        // Act & Assert
        await expect(settingsService.updateSettings(updateData)).rejects.toThrow('Invalid theme');
      });

      it('無効な言語設定でバリデーションエラーが発生する', async () => {
        // Arrange
        const updateData = {
          language: 'invalid-language' as any
        };

        // Act & Assert
        await expect(settingsService.updateSettings(updateData)).rejects.toThrow('Invalid language');
      });
    });
  });

  describe('アプリ設定管理', () => {
    const mockAppSettings: AppSettings = {
      id: 'app-123',
      taskInsertPosition: 'top',
      autoSort: false
    };

    describe('getApp', () => {
      it('アプリ設定の取得が成功する', async () => {
        // Arrange
        mockHttpClient.get.mockResolvedValue({
          data: mockAppSettings,
          message: 'App settings retrieved successfully'
        });

        // Act
        const result = await settingsService.getApp();

        // Assert
        expect(result.data).toEqual(mockAppSettings);
        expect(result.message).toBe('App settings retrieved successfully');
        expect(mockHttpClient.get).toHaveBeenCalledWith('/app');
      });
    });

    describe('updateApp', () => {
      it('アプリ設定の更新が成功する', async () => {
        // Arrange
        const updateData: Partial<AppSettings> = {
          taskInsertPosition: 'bottom',
          autoSort: true
        };
        const updatedSettings: AppSettings = {
          ...mockAppSettings,
          taskInsertPosition: 'bottom',
          autoSort: true
        };

        mockHttpClient.put.mockResolvedValue({
          data: updatedSettings,
          message: 'App settings updated successfully'
        });

        // Act
        const result = await settingsService.updateApp(updateData);

        // Assert
        expect(result.data).toEqual(updatedSettings);
        expect(result.message).toBe('App settings updated successfully');
        expect(mockHttpClient.put).toHaveBeenCalledWith('/app', updateData);
      });

      it('無効なタスク挿入位置でバリデーションエラーが発生する', async () => {
        // Arrange
        const updateData = {
          taskInsertPosition: 'invalid-position' as any
        };

        // Act & Assert
        await expect(settingsService.updateApp(updateData)).rejects.toThrow('Invalid task insert position');
      });
    });
  });

  describe('タスクリスト順序管理', () => {
    const mockTaskListOrder = ['list-1', 'list-2', 'list-3'];

    describe('getTaskListOrder', () => {
      it('タスクリスト順序の取得が成功する', async () => {
        // Arrange
        mockHttpClient.get.mockResolvedValue({
          data: mockTaskListOrder,
          message: 'Task list order retrieved successfully'
        });

        // Act
        const result = await settingsService.getTaskListOrder();

        // Assert
        expect(result.data).toEqual(mockTaskListOrder);
        expect(result.message).toBe('Task list order retrieved successfully');
        expect(mockHttpClient.get).toHaveBeenCalledWith('/app/taskListOrder');
      });
    });

    describe('updateTaskListOrder', () => {
      it('タスクリスト順序の更新が成功する', async () => {
        // Arrange
        const newOrder = ['list-3', 'list-1', 'list-2'];
        
        mockHttpClient.put.mockResolvedValue({
          data: null,
          message: 'Task list order updated successfully'
        });

        // Act
        const result = await settingsService.updateTaskListOrder(newOrder);

        // Assert
        expect(result.message).toBe('Task list order updated successfully');
        expect(mockHttpClient.put).toHaveBeenCalledWith('/app/taskListOrder', { order: newOrder });
      });

      it('空の配列でバリデーションエラーが発生する', async () => {
        // Arrange
        const emptyOrder: string[] = [];

        // Act & Assert
        await expect(settingsService.updateTaskListOrder(emptyOrder)).rejects.toThrow('Task list order cannot be empty');
      });

      it('無効な配列でバリデーションエラーが発生する', async () => {
        // Arrange
        const invalidOrder = ['', 'list-1', null] as any;

        // Act & Assert
        await expect(settingsService.updateTaskListOrder(invalidOrder)).rejects.toThrow('Invalid task list ID');
      });
    });
  });
});