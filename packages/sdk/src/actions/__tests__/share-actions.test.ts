import { describe, it, expect, beforeEach } from 'vitest';
import { ShareActions } from '../index';
import { ShareActionsImpl } from '../implementation/share-actions';
import { 
  setupActionsTests, 
  mockShareService,
  mockStore, 
  mockTaskList,
  mockTaskListShare,
  expectActionSuccess,
  expectActionFailure,
  createApiResponse
} from './setup';

describe('ShareActions', () => {
  let shareActions: ShareActions;

  setupActionsTests();

  beforeEach(() => {
    shareActions = new ShareActionsImpl(mockShareService, mockStore);
  });

  describe('createShareLink', () => {
    it('共有リンクを作成する', async () => {
      // Arrange
      const taskListId = 'list1';
      
      mockShareService.createShareLink.mockResolvedValue(createApiResponse(mockTaskListShare));

      // Act
      const result = await shareActions.createShareLink(taskListId);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(mockTaskListShare);
      
      // ShareService が正しく呼び出されたか確認
      expect(mockShareService.createShareLink).toHaveBeenCalledWith(taskListId);
    });
  });

  describe('getSharedTaskList', () => {
    it('共有タスクリストを取得する', async () => {
      // Arrange
      const shareToken = 'share-token';
      
      mockShareService.getSharedTaskList.mockResolvedValue(createApiResponse(mockTaskList));

      // Act
      const result = await shareActions.getSharedTaskList(shareToken);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(mockTaskList);
      
      // ShareService が正しく呼び出されたか確認
      expect(mockShareService.getSharedTaskList).toHaveBeenCalledWith(shareToken);
    });
  });

  describe('copySharedTaskList', () => {
    it('共有タスクリストを自分のアプリにコピーする', async () => {
      // Arrange
      const shareToken = 'share-token';
      
      mockShareService.copySharedTaskList.mockResolvedValue(createApiResponse(mockTaskList));

      // Act
      const result = await shareActions.copySharedTaskList(shareToken);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(mockTaskList);
      
      // ShareService が正しく呼び出されたか確認
      expect(mockShareService.copySharedTaskList).toHaveBeenCalledWith(shareToken);
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalled();
    });
  });

  describe('removeShareLink', () => {
    it('共有リンクを無効化する', async () => {
      // Arrange
      const taskListId = 'list1';
      
      mockShareService.removeShareLink.mockResolvedValue(undefined);

      // Act
      const result = await shareActions.removeShareLink(taskListId);

      // Assert
      expectActionSuccess(result);
      
      // ShareService が正しく呼び出されたか確認
      expect(mockShareService.removeShareLink).toHaveBeenCalledWith(taskListId);
    });
  });
});