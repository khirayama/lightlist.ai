import { describe, it, expect, beforeEach } from 'vitest';
import { TaskListActions } from '../index';
import { TaskListActionsImpl } from '../implementation/tasklist-actions';
import { 
  setupActionsTests, 
  mockCollaborativeService,
  mockSettingsService,
  mockStore, 
  mockTaskList,
  mockAppError,
  expectActionSuccess,
  expectActionFailure
} from './setup';

describe('TaskListActions', () => {
  let taskListActions: TaskListActions;

  setupActionsTests();

  beforeEach(() => {
    taskListActions = new TaskListActionsImpl(
      mockCollaborativeService, 
      mockSettingsService, 
      mockStore
    );
  });

  describe('getTaskLists', () => {
    it('タスクリスト一覧を取得してストアに保存する', async () => {
      // Arrange
      const taskListOrder = ['list1', 'list2'];
      const taskLists = [mockTaskList, { ...mockTaskList, id: 'list2' }];
      
      mockSettingsService.getTaskListOrder.mockResolvedValue(taskListOrder);
      mockCollaborativeService.getTaskListDocument.mockResolvedValue(mockTaskList);

      // Act
      const result = await taskListActions.getTaskLists();

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toHaveLength(2);
      
      // SettingsService とCollaborativeService が正しく呼び出されたか確認
      expect(mockSettingsService.getTaskListOrder).toHaveBeenCalledTimes(1);
      expect(mockCollaborativeService.getTaskListDocument).toHaveBeenCalledTimes(2);
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          taskLists: expect.any(Array)
        })
      );
    });

    it('サービスエラーの場合、エラーを返す', async () => {
      // Arrange
      mockSettingsService.getTaskListOrder.mockRejectedValue(
        new Error('Failed to fetch task list order')
      );

      // Act
      const result = await taskListActions.getTaskLists();

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('network');
      expect(error.message).toContain('Failed to fetch task list order');
    });
  });

  describe('createTaskList', () => {
    it('タスクリストを作成し、Y.jsドキュメントとセッションを開始する', async () => {
      // Arrange
      const newTaskList = {
        name: 'New Task List',
        background: '#FF0000'
      };
      
      mockCollaborativeService.createTaskListDocument.mockResolvedValue(mockTaskList);
      mockCollaborativeService.startSession.mockResolvedValue(undefined);

      // Act
      const result = await taskListActions.createTaskList(newTaskList);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(mockTaskList);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.createTaskListDocument).toHaveBeenCalledWith(
        expect.objectContaining(newTaskList)
      );
      expect(mockCollaborativeService.startSession).toHaveBeenCalledWith(mockTaskList.id);
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          taskLists: expect.arrayContaining([
            expect.objectContaining({ id: mockTaskList.id })
          ]),
          activeSessionIds: expect.arrayContaining([mockTaskList.id])
        })
      );
    });

    it('バリデーションエラーの場合、エラーを返し、セッションを開始しない', async () => {
      // Arrange
      const invalidTaskList = {
        name: '', // 空の名前
        background: 'invalid-color'
      };
      
      const validationError = new Error('Invalid task list data');
      (validationError as any).status = 400;
      mockCollaborativeService.createTaskListDocument.mockRejectedValue(validationError);

      // Act
      const result = await taskListActions.createTaskList(invalidTaskList);

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('validation');
      expect(error.message).toContain('Invalid task list data');
      
      // セッションが開始されていないか確認
      expect(mockCollaborativeService.startSession).not.toHaveBeenCalled();
      
      // Store が更新されていないか確認
      expect(mockStore.setState).not.toHaveBeenCalled();
    });
  });

  describe('updateTaskList', () => {
    it('タスクリストを更新し、Y.js経由で同期する', async () => {
      // Arrange
      const taskListId = 'list1';
      const updates = { name: 'Updated Task List' };
      const updatedTaskList = { ...mockTaskList, ...updates };
      
      mockCollaborativeService.updateTaskListDocument.mockResolvedValue(updatedTaskList);

      // Act
      const result = await taskListActions.updateTaskList(taskListId, updates);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(updatedTaskList);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.updateTaskListDocument).toHaveBeenCalledWith(
        taskListId, 
        updates
      );
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          taskLists: expect.any(Array)
        })
      );
    });

    it('存在しないタスクリストIDの場合、エラーを返す', async () => {
      // Arrange
      const nonExistentId = 'non-existent-list';
      const updates = { name: 'Updated Task List' };
      
      const notFoundError = new Error('Task list not found');
      (notFoundError as any).status = 404;
      mockCollaborativeService.updateTaskListDocument.mockRejectedValue(notFoundError);

      // Act
      const result = await taskListActions.updateTaskList(nonExistentId, updates);

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('network');
      expect(error.message).toContain('Task list not found');
    });
  });

  describe('deleteTaskList', () => {
    it('タスクリストを削除し、セッションを終了する', async () => {
      // Arrange
      const taskListId = 'list1';
      
      mockCollaborativeService.deleteTaskListDocument.mockResolvedValue(undefined);
      mockCollaborativeService.endSession.mockResolvedValue(undefined);

      // Act
      const result = await taskListActions.deleteTaskList(taskListId);

      // Assert
      expectActionSuccess(result);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.deleteTaskListDocument).toHaveBeenCalledWith(taskListId);
      expect(mockCollaborativeService.endSession).toHaveBeenCalledWith(taskListId);
      
      // Store からタスクリストが削除されたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          taskLists: expect.not.arrayContaining([
            expect.objectContaining({ id: taskListId })
          ]),
          activeSessionIds: expect.not.arrayContaining([taskListId])
        })
      );
    });

    it('削除に失敗した場合、エラーを返しセッションを終了しない', async () => {
      // Arrange
      const taskListId = 'list1';
      
      const deleteError = new Error('Failed to delete task list');
      mockCollaborativeService.deleteTaskListDocument.mockRejectedValue(deleteError);

      // Act
      const result = await taskListActions.deleteTaskList(taskListId);

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('network');
      expect(error.message).toContain('Failed to delete task list');
      
      // セッションが終了されていないか確認
      expect(mockCollaborativeService.endSession).not.toHaveBeenCalled();
    });
  });

  describe('moveTaskList', () => {
    it('タスクリストの順序を変更し、永続化する', async () => {
      // Arrange
      const fromIndex = 0;
      const toIndex = 0; // 同じインデックスに移動（有効な移動）
      
      // モックストアに複数のタスクリストが存在することを確認
      const mockStateWithMultipleLists = {
        ...mockStore.getState(),
        taskLists: [mockTaskList, { ...mockTaskList, id: 'list2' }]
      };
      mockStore.getState.mockReturnValue(mockStateWithMultipleLists);
      
      mockSettingsService.updateTaskListOrder.mockResolvedValue(undefined);

      // Act
      const result = await taskListActions.moveTaskList(fromIndex, toIndex);

      // Assert
      expectActionSuccess(result);
      
      // SettingsService が正しく呼び出されたか確認
      expect(mockSettingsService.updateTaskListOrder).toHaveBeenCalledWith(
        expect.any(Array)
      );
      
      // Store のタスクリストが並び替えられているか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          taskLists: expect.any(Array)
        })
      );
    });

    it('無効なインデックスの場合、エラーを返す', async () => {
      // Arrange
      const fromIndex = -1;
      const toIndex = 100;
      
      // モックストアに有効なタスクリストが存在することを確認
      const mockStateWithLists = {
        ...mockStore.getState(),
        taskLists: [mockTaskList]
      };
      mockStore.getState.mockReturnValue(mockStateWithLists);

      // Act
      const result = await taskListActions.moveTaskList(fromIndex, toIndex);

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('validation');
      expect(error.message).toContain('Invalid move operation');
      
      // SettingsService が呼び出されていないか確認（バリデーションエラーのため）
      expect(mockSettingsService.updateTaskListOrder).not.toHaveBeenCalled();
    });
  });

  describe('duplicateTaskList', () => {
    it('タスクリストを複製し、新しいセッションを開始する', async () => {
      // Arrange
      const originalId = 'list1';
      const duplicatedTaskList = { ...mockTaskList, id: 'list1-copy', name: 'Mock Task List (Copy)' };
      
      mockCollaborativeService.getTaskListDocument.mockResolvedValue(mockTaskList);
      mockCollaborativeService.createTaskListDocument.mockResolvedValue(duplicatedTaskList);
      mockCollaborativeService.startSession.mockResolvedValue(undefined);

      // Act
      const result = await taskListActions.duplicateTaskList(originalId);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(duplicatedTaskList);
      
      // CollaborativeService が正しく呼び出されたか確認
      expect(mockCollaborativeService.getTaskListDocument).toHaveBeenCalledWith(originalId);
      expect(mockCollaborativeService.createTaskListDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Copy')
        })
      );
      expect(mockCollaborativeService.startSession).toHaveBeenCalledWith(duplicatedTaskList.id);
    });
  });
});