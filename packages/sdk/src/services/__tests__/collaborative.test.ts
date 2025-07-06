import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollaborativeService } from '../index';
import { CollaborativeServiceImpl } from '../collaborative.service';
import { setupServiceTests, mockHttpClient, TEST_BASE_URL } from './setup';
import { CollaborativeSession, CollaborativeState, TaskList, Task } from '../types';

describe('CollaborativeService', () => {
  let collaborativeService: CollaborativeService;

  setupServiceTests();

  beforeEach(() => {
    collaborativeService = new CollaborativeServiceImpl(mockHttpClient, TEST_BASE_URL);
  });

  describe('セッション管理', () => {
    const mockCollaborativeSession: CollaborativeSession = {
      id: 'session-123',
      taskListId: 'list-123',
      deviceId: 'device-123',
      sessionType: 'active',
      expiresAt: '2024-01-01T13:00:00Z',
      isActive: true
    };

    describe('startSession', () => {
      it('アクティブセッションの開始が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        const sessionType = 'active';
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            sessionId: 'session-123',
            documentState: 'base64-encoded-document',
            stateVector: 'base64-encoded-state-vector',
            expiresAt: '2024-01-01T13:00:00Z'
          },
          message: 'Session started successfully'
        });

        // Act
        const result = await collaborativeService.startSession(taskListId, sessionType);

        // Assert
        expect(result.data.sessionId).toBe('session-123');
        expect(result.data.documentState).toBe('base64-encoded-document');
        expect(result.data.stateVector).toBe('base64-encoded-state-vector');
        expect(mockHttpClient.post).toHaveBeenCalledWith('/collaborative/sessions/list-123', { sessionType });
      });

      it('バックグラウンドセッションの開始が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        const sessionType = 'background';
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            sessionId: 'session-123',
            documentState: 'base64-encoded-document',
            stateVector: 'base64-encoded-state-vector',
            expiresAt: '2024-01-01T13:00:00Z'
          },
          message: 'Session started successfully'
        });

        // Act
        const result = await collaborativeService.startSession(taskListId, sessionType);

        // Assert
        expect(result.data.sessionId).toBe('session-123');
        expect(mockHttpClient.post).toHaveBeenCalledWith('/collaborative/sessions/list-123', { sessionType });
      });

      it('無効なタスクリストIDでバリデーションエラーが発生する', async () => {
        // Arrange
        const taskListId = '';
        const sessionType = 'active';

        // Act & Assert
        await expect(collaborativeService.startSession(taskListId, sessionType))
          .rejects.toThrow('Invalid taskListId parameter');
      });

      it('無効なセッションタイプでバリデーションエラーが発生する', async () => {
        // Arrange
        const taskListId = 'list-123';
        const sessionType = 'invalid' as any;

        // Act & Assert
        await expect(collaborativeService.startSession(taskListId, sessionType))
          .rejects.toThrow('Invalid session type');
      });
    });

    describe('getState', () => {
      it('セッション状態の取得が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        const mockState: CollaborativeState = {
          documentState: 'base64-encoded-document',
          stateVector: 'base64-encoded-state-vector',
          hasUpdates: true
        };
        
        mockHttpClient.get.mockResolvedValue({
          data: mockState,
          message: 'State retrieved successfully'
        });

        // Act
        const result = await collaborativeService.getState(taskListId);

        // Assert
        expect(result.data).toEqual(mockState);
        expect(mockHttpClient.get).toHaveBeenCalledWith('/collaborative/sessions/list-123');
      });
    });

    describe('sendUpdate', () => {
      it('Y.js更新の送信が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        const update = 'base64-encoded-update';
        
        mockHttpClient.put.mockResolvedValue({
          data: {
            success: true,
            stateVector: 'new-state-vector'
          },
          message: 'Update sent successfully'
        });

        // Act
        const result = await collaborativeService.sendUpdate(taskListId, update);

        // Assert
        expect(result.data.success).toBe(true);
        expect(result.data.stateVector).toBe('new-state-vector');
        expect(mockHttpClient.put).toHaveBeenCalledWith('/collaborative/sessions/list-123', { update });
      });

      it('空の更新データでバリデーションエラーが発生する', async () => {
        // Arrange
        const taskListId = 'list-123';
        const update = '';

        // Act & Assert
        await expect(collaborativeService.sendUpdate(taskListId, update))
          .rejects.toThrow('Update data is required');
      });
    });

    describe('maintainSession', () => {
      it('セッション維持が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        
        mockHttpClient.patch.mockResolvedValue({
          data: null,
          message: 'Session maintained successfully'
        });

        // Act
        const result = await collaborativeService.maintainSession(taskListId);

        // Assert
        expect(result.message).toBe('Session maintained successfully');
        expect(mockHttpClient.patch).toHaveBeenCalledWith('/collaborative/sessions/list-123');
      });
    });

    describe('endSession', () => {
      it('セッション終了が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        
        mockHttpClient.delete.mockResolvedValue({
          data: null,
          message: 'Session ended successfully'
        });

        // Act
        const result = await collaborativeService.endSession(taskListId);

        // Assert
        expect(result.message).toBe('Session ended successfully');
        expect(mockHttpClient.delete).toHaveBeenCalledWith('/collaborative/sessions/list-123');
      });
    });
  });

  describe('タスクリスト初期化', () => {
    const mockTaskList: TaskList = {
      id: 'list-123',
      name: 'Test List',
      background: '#FF0000',
      tasks: [
        {
          id: 'task-1',
          text: 'Task 1',
          completed: false,
          taskListId: 'list-123',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ],
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z'
    };

    describe('initializeTaskList', () => {
      it('タスクリスト初期化が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        
        mockHttpClient.get.mockResolvedValue({
          data: mockTaskList,
          message: 'TaskList initialized successfully'
        });

        // Act
        const result = await collaborativeService.initializeTaskList(taskListId);

        // Assert
        expect(result.data).toEqual(mockTaskList);
        expect(mockHttpClient.get).toHaveBeenCalledWith('/collaborative/taskLists/list-123');
      });
    });
  });

  describe('Y.js操作ヘルパー', () => {
    describe('createTaskListDocument', () => {
      it('タスクリストドキュメントの作成が成功する', async () => {
        // Arrange
        const taskList: Partial<TaskList> = {
          name: 'New List',
          background: '#00FF00'
        };
        
        const createdTaskList: TaskList = {
          id: 'list-new',
          name: 'New List',
          background: '#00FF00',
          tasks: [],
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        };

        mockHttpClient.post.mockResolvedValue({
          data: createdTaskList,
          message: 'TaskList created successfully'
        });

        // Act
        const result = await collaborativeService.createTaskListDocument(taskList);

        // Assert
        expect(result.data).toEqual(createdTaskList);
        expect(mockHttpClient.post).toHaveBeenCalledWith('/collaborative/taskLists', taskList);
      });
    });

    describe('createTaskInDocument', () => {
      it('タスクの作成が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        const task: Partial<Task> = {
          text: 'New Task',
          completed: false
        };
        
        const createdTask: Task = {
          id: 'task-new',
          text: 'New Task',
          completed: false,
          taskListId: 'list-123',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        };

        mockHttpClient.post.mockResolvedValue({
          data: createdTask,
          message: 'Task created successfully'
        });

        // Act
        const result = await collaborativeService.createTaskInDocument(taskListId, task);

        // Assert
        expect(result.data).toEqual(createdTask);
        expect(mockHttpClient.post).toHaveBeenCalledWith('/collaborative/taskLists/list-123/tasks', task);
      });
    });

    describe('moveTaskInDocument', () => {
      it('タスクの移動が成功する', async () => {
        // Arrange
        const taskListId = 'list-123';
        const taskId = 'task-123';
        const fromIndex = 0;
        const toIndex = 2;
        
        mockHttpClient.patch.mockResolvedValue({
          data: null,
          message: 'Task moved successfully'
        });

        // Act
        const result = await collaborativeService.moveTaskInDocument(taskListId, taskId, fromIndex, toIndex);

        // Assert
        expect(result.message).toBe('Task moved successfully');
        expect(mockHttpClient.patch).toHaveBeenCalledWith(
          '/collaborative/taskLists/list-123/tasks/task-123/move',
          { fromIndex, toIndex }
        );
      });
    });
  });
});