import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskActions } from '../index';
import { TaskActionsImpl } from '../task-actions';
import { 
  setupActionsTests, 
  mockCollaborativeService,
  mockStore, 
  mockTask,
  mockTaskList,
  expectActionSuccess,
  expectActionFailure,
  createApiResponse
} from './setup';

describe('TaskActions', () => {
  let taskActions: TaskActions;

  setupActionsTests();

  beforeEach(() => {
    taskActions = new TaskActionsImpl(mockCollaborativeService, mockStore);
  });

  describe('createTask', () => {
    it('タスクを作成し、Y.js経由で同期する', async () => {
      // Arrange
      const newTask = {
        text: 'New Task',
        taskListId: 'list1'
      };
      
      mockCollaborativeService.createTaskInDocument.mockResolvedValue(createApiResponse(mockTask));

      // Act
      const result = await taskActions.createTask(newTask);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(mockTask);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.createTaskInDocument).toHaveBeenCalledWith(
        'list1',
        expect.objectContaining(newTask)
      );
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('タスクを更新し、Y.js経由で同期する', async () => {
      // Arrange
      const taskId = 'mock-task-id';
      const updates = { text: 'Updated Task' };
      const updatedTask = { ...mockTask, ...updates, updatedAt: '2024-01-01T00:00:00.000Z' };
      
      // Date を固定値にモック化
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      
      mockCollaborativeService.updateTaskInDocument.mockResolvedValue(updatedTask);

      // Act
      const result = await taskActions.updateTask(taskId, updates);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(updatedTask);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.updateTaskInDocument).toHaveBeenCalledWith(
        mockTask.taskListId, 
        taskId, 
        updates
      );
      
      // システム時刻を元に戻す
      vi.useRealTimers();
    });
  });

  describe('deleteTask', () => {
    it('タスクを削除し、Y.js経由で同期する', async () => {
      // Arrange
      const taskId = 'mock-task-id';
      
      mockCollaborativeService.deleteTaskInDocument.mockResolvedValue(undefined);

      // Act
      const result = await taskActions.deleteTask(taskId);

      // Assert
      expectActionSuccess(result);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.deleteTaskInDocument).toHaveBeenCalledWith(
        mockTask.taskListId, 
        taskId
      );
    });
  });

  describe('toggleTaskCompletion', () => {
    it('タスクの完了状態を切り替える', async () => {
      // Arrange
      const taskId = 'mock-task-id';
      const existingTask = { ...mockTask, id: taskId };
      const toggledTask = { ...existingTask, completed: !existingTask.completed, updatedAt: '2024-01-01T00:00:00.000Z' };
      
      // ストアにタスクが存在するように設定
      const mockStateWithTask = {
        ...mockStore.getState(),
        taskLists: [{
          ...mockTaskList,
          tasks: [existingTask]
        }]
      };
      mockStore.getState.mockReturnValue(mockStateWithTask);
      
      // Date を固定値にモック化
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      
      mockCollaborativeService.updateTaskInDocument.mockResolvedValue(toggledTask);

      // Act
      const result = await taskActions.toggleTaskCompletion(taskId);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(toggledTask);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.updateTaskInDocument).toHaveBeenCalledWith(
        mockTask.taskListId, 
        taskId, 
        expect.objectContaining({ completed: expect.any(Boolean) })
      );
      
      // システム時刻を元に戻す
      vi.useRealTimers();
    });
  });

  describe('moveTask', () => {
    it('タスクを移動し、Y.js経由で順序を同期する', async () => {
      // Arrange
      const taskId = 'mock-task-id';
      const fromIndex = 0;
      const toIndex = 1;
      
      mockCollaborativeService.moveTaskInDocument.mockResolvedValue(undefined);

      // Act
      const result = await taskActions.moveTask(taskId, fromIndex, toIndex);

      // Assert
      expectActionSuccess(result);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.moveTaskInDocument).toHaveBeenCalledWith(
        mockTask.taskListId, 
        taskId, 
        fromIndex, 
        toIndex
      );
    });
  });
});