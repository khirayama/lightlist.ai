import { describe, it, expect, beforeEach } from 'vitest';
import { TaskActions } from '../index';
import { TaskActionsImpl } from '../implementation/task-actions';
import { 
  setupActionsTests, 
  mockCollaborativeService,
  mockStore, 
  mockTask,
  mockTaskList,
  expectActionSuccess,
  expectActionFailure
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
      
      mockCollaborativeService.createTaskInDocument.mockResolvedValue(mockTask);

      // Act
      const result = await taskActions.createTask(newTask);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(mockTask);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.createTaskInDocument).toHaveBeenCalledWith(
        expect.objectContaining(newTask)
      );
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('タスクを更新し、Y.js経由で同期する', async () => {
      // Arrange
      const taskId = 'task1';
      const updates = { text: 'Updated Task' };
      const updatedTask = { ...mockTask, ...updates };
      
      mockCollaborativeService.updateTaskInDocument.mockResolvedValue(updatedTask);

      // Act
      const result = await taskActions.updateTask(taskId, updates);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(updatedTask);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.updateTaskInDocument).toHaveBeenCalledWith(
        taskId, 
        updates
      );
    });
  });

  describe('deleteTask', () => {
    it('タスクを削除し、Y.js経由で同期する', async () => {
      // Arrange
      const taskId = 'task1';
      
      mockCollaborativeService.deleteTaskInDocument.mockResolvedValue(undefined);

      // Act
      const result = await taskActions.deleteTask(taskId);

      // Assert
      expectActionSuccess(result);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.deleteTaskInDocument).toHaveBeenCalledWith(taskId);
    });
  });

  describe('toggleTaskCompletion', () => {
    it('タスクの完了状態を切り替える', async () => {
      // Arrange
      const taskId = 'task1';
      const existingTask = { ...mockTask, id: taskId };
      const toggledTask = { ...existingTask, completed: !existingTask.completed };
      
      // ストアにタスクが存在するように設定
      const mockStateWithTask = {
        ...mockStore.getState(),
        taskLists: [{
          ...mockTaskList,
          tasks: [existingTask]
        }]
      };
      mockStore.getState.mockReturnValue(mockStateWithTask);
      
      mockCollaborativeService.updateTaskInDocument.mockResolvedValue(toggledTask);

      // Act
      const result = await taskActions.toggleTaskCompletion(taskId);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(toggledTask);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.updateTaskInDocument).toHaveBeenCalledWith(
        taskId, 
        expect.objectContaining({ completed: expect.any(Boolean) })
      );
    });
  });

  describe('moveTask', () => {
    it('タスクを移動し、Y.js経由で順序を同期する', async () => {
      // Arrange
      const taskId = 'task1';
      const fromIndex = 0;
      const toIndex = 1;
      
      mockCollaborativeService.moveTaskInDocument.mockResolvedValue(undefined);

      // Act
      const result = await taskActions.moveTask(taskId, fromIndex, toIndex);

      // Assert
      expectActionSuccess(result);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.moveTaskInDocument).toHaveBeenCalledWith(
        taskId, 
        fromIndex, 
        toIndex,
        undefined
      );
    });
  });
});