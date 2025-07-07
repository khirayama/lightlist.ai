import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShareService } from '../index';
import { ShareServiceImpl } from '../share.service';
import { setupServiceTests, mockHttpClient, TEST_BASE_URL } from './setup';
import { TaskListShare, TaskList } from '../types';

describe('ShareService', () => {
  let shareService: ShareService;

  setupServiceTests();

  beforeEach(() => {
    shareService = new ShareServiceImpl(mockHttpClient, TEST_BASE_URL);
  });

  describe('共有リンク管理', () => {
    const mockTaskListShare: TaskListShare = {
      taskListId: 'list-123',
      shareToken: 'share-token-123',
      shareUrl: 'https://app.example.com/share/share-token-123',
      isActive: true
    };

    describe('createShareLink', () => {
      it('共有リンクの生成が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        
        mockHttpClient.post.mockResolvedValue({
          data: mockTaskListShare,
          message: 'Share link created successfully'
        });

        // Act
        const result = await shareService.createShareLink(taskListId);

        // Assert
        expect(result.data).toEqual(mockTaskListShare);
        expect(result.message).toBe('Share link created successfully');
        expect(mockHttpClient.post).toHaveBeenCalledWith('/share/list-123');
      });

      it('無効なタスクリストIDでバリデーションエラーが発生する', async () => {
        // Arrange
        const taskListId = '';

        // Act & Assert
        await expect(shareService.createShareLink(taskListId))
          .rejects.toThrow('Invalid taskListId parameter');
      });

      it('既に共有されているタスクリストでエラーが発生する', async () => {
        // Arrange
        const taskListId = 'list-123';
        mockHttpClient.post.mockRejectedValue(new Error('TaskList is already shared'));

        // Act & Assert
        await expect(shareService.createShareLink(taskListId))
          .rejects.toThrow('TaskList is already shared');
      });
    });

    describe('removeShareLink', () => {
      it('共有リンクの削除が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        
        mockHttpClient.delete.mockResolvedValue({
          data: null,
          message: 'Share link removed successfully'
        });

        // Act
        const result = await shareService.removeShareLink(taskListId);

        // Assert
        expect(result.message).toBe('Share link removed successfully');
        expect(mockHttpClient.delete).toHaveBeenCalledWith('/share/list-123');
      });

      it('共有されていないタスクリストでエラーが発生する', async () => {
        // Arrange
        const taskListId = 'list-123';
        mockHttpClient.delete.mockRejectedValue(new Error('Share link not found'));

        // Act & Assert
        await expect(shareService.removeShareLink(taskListId))
          .rejects.toThrow('Share link not found');
      });
    });
  });

  describe('共有タスクリスト閲覧', () => {
    const mockSharedTaskList: TaskList = {
      id: 'list-123',
      name: '共有タスクリスト',
      background: '#00FF00',
      tasks: [
        {
          id: 'task-1',
          text: '共有タスク',
          completed: false,
          taskListId: 'list-123',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ],
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z'
    };

    describe('getSharedTaskList', () => {
      it('共有タスクリストの取得が成功する', async () => {
        // Arrange
        const shareToken = 'share-token-123';
        
        mockHttpClient.get.mockResolvedValue({
          data: {
            taskList: mockSharedTaskList,
            isReadOnly: true
          },
          message: 'Shared task list retrieved successfully'
        });

        // Act
        const result = await shareService.getSharedTaskList(shareToken);

        // Assert
        expect(result.data).toEqual(expect.objectContaining({
          id: mockSharedTaskList.id,
          name: mockSharedTaskList.name,
          background: mockSharedTaskList.background,
          tasks: expect.arrayContaining([
            expect.objectContaining({
              id: mockSharedTaskList.tasks[0].id,
              text: mockSharedTaskList.tasks[0].text,
              completed: mockSharedTaskList.tasks[0].completed,
              taskListId: mockSharedTaskList.tasks[0].taskListId
            })
          ])
        }));
        expect(result.message).toBe('Shared task list retrieved successfully');
        expect(mockHttpClient.get).toHaveBeenCalledWith('/share/share-token-123');
      });

      it('無効な共有トークンでバリデーションエラーが発生する', async () => {
        // Arrange
        const shareToken = '';

        // Act & Assert
        await expect(shareService.getSharedTaskList(shareToken))
          .rejects.toThrow('Invalid shareToken parameter');
      });

      it('期限切れの共有トークンでエラーが発生する', async () => {
        // Arrange
        const shareToken = 'expired-token';
        mockHttpClient.get.mockRejectedValue(new Error('Share token expired'));

        // Act & Assert
        await expect(shareService.getSharedTaskList(shareToken))
          .rejects.toThrow('Share token expired');
      });

      it('存在しない共有トークンでエラーが発生する', async () => {
        // Arrange
        const shareToken = 'nonexistent-token';
        mockHttpClient.get.mockRejectedValue(new Error('Share token not found'));

        // Act & Assert
        await expect(shareService.getSharedTaskList(shareToken))
          .rejects.toThrow('Share token not found');
      });
    });

    describe('copySharedTaskList', () => {
      it('共有タスクリストのコピーが成功する', async () => {
        // Arrange
        const shareToken = 'share-token-123';
        const copiedTaskList: TaskList = {
          ...mockSharedTaskList,
          id: 'list-new-copy',
          name: '共有タスクリスト (コピー)'
        };
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            taskList: copiedTaskList
          },
          message: 'Task list copied successfully'
        });

        // Act
        const result = await shareService.copySharedTaskList(shareToken);

        // Assert
        expect(result.data).toEqual(copiedTaskList);
        expect(result.message).toBe('Task list copied successfully');
        expect(mockHttpClient.post).toHaveBeenCalledWith('/share/share-token-123/copy');
      });

      it('認証されていない状態でエラーが発生する', async () => {
        // Arrange
        const shareToken = 'share-token-123';
        mockHttpClient.post.mockRejectedValue(new Error('Authentication required'));

        // Act & Assert
        await expect(shareService.copySharedTaskList(shareToken))
          .rejects.toThrow('Authentication required');
      });

      it('無効な共有トークンでバリデーションエラーが発生する', async () => {
        // Arrange
        const shareToken = '';

        // Act & Assert
        await expect(shareService.copySharedTaskList(shareToken))
          .rejects.toThrow('Invalid shareToken parameter');
      });
    });
  });

  describe('共有トークンバリデーション', () => {
    it('有効な共有トークン形式を受け入れる', async () => {
      // Arrange
      const validTokens = [
        'share_abc123def456',
        'share_123456789012',
        'share_abcdefghijklmnop'
      ];

      mockHttpClient.get.mockResolvedValue({
        data: {
          taskList: { id: 'list-123', name: 'Test', tasks: [], background: '#FF0000' },
          isReadOnly: true
        },
        message: 'Success'
      });

      // Act & Assert
      for (const token of validTokens) {
        await expect(shareService.getSharedTaskList(token)).resolves.toBeDefined();
      }
    });

    it('無効な共有トークン形式を拒否する', async () => {
      // Arrange
      const invalidTokens = [
        '', // 空文字
        '   ', // 空白のみ
        'invalid-token', // 無効な形式
        'share_', // プレフィックスのみ
        'not_share_token' // 間違ったプレフィックス
      ];

      // Act & Assert
      for (const token of invalidTokens) {
        await expect(shareService.getSharedTaskList(token))
          .rejects.toThrow('Invalid shareToken parameter');
      }
    });
  });
});