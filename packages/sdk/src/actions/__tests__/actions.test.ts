import { describe, it, expect, beforeEach } from 'vitest';
import { Actions } from '../index';
import { ActionsImpl } from '../implementation/actions';
import { 
  setupActionsTests, 
  mockAuthService,
  mockSettingsService,
  mockCollaborativeService,
  mockShareService,
  mockStore
} from './setup';

describe('Actions（統合）', () => {
  let actions: Actions;

  setupActionsTests();

  beforeEach(() => {
    actions = new ActionsImpl(
      mockAuthService,
      mockSettingsService,
      mockCollaborativeService,
      mockShareService,
      mockStore
    );
  });

  it('全てのActionsクラスが正しく初期化される', () => {
    // Assert
    expect(actions.auth).toBeDefined();
    expect(actions.settings).toBeDefined();
    expect(actions.taskLists).toBeDefined();
    expect(actions.tasks).toBeDefined();
    expect(actions.share).toBeDefined();
  });

  it('AuthActionsが正しく動作する', async () => {
    // Arrange
    const credential = {
      email: 'test@example.com',
      password: 'password123',
      deviceId: 'device-123'
    };

    // Act
    const result = await actions.auth.register(credential);

    // Assert
    expect(result.success).toBe(true);
    expect(mockAuthService.register).toHaveBeenCalledWith(credential);
  });

  it('SettingsActionsが正しく動作する', async () => {
    // Act
    const result = await actions.settings.getSettings();

    // Assert
    expect(result.success).toBe(true);
    expect(mockSettingsService.getSettings).toHaveBeenCalled();
  });

  it('TaskListActionsが正しく動作する', async () => {
    // Act
    const result = await actions.taskLists.getTaskLists();

    // Assert
    expect(result.success).toBe(true);
    expect(mockSettingsService.getTaskListOrder).toHaveBeenCalled();
  });

  it('TaskActionsが正しく動作する', async () => {
    // Arrange
    const newTask = {
      text: 'Test Task',
      taskListId: 'list1'
    };

    // Act
    const result = await actions.tasks.createTask(newTask);

    // Assert
    expect(result.success).toBe(true);
    expect(mockCollaborativeService.createTaskInDocument).toHaveBeenCalledWith(
      'list1',
      expect.objectContaining(newTask)
    );
  });

  it('ShareActionsが正しく動作する', async () => {
    // Arrange
    const taskListId = 'list1';

    // Act
    const result = await actions.share.createShareLink(taskListId);

    // Assert
    expect(result.success).toBe(true);
    expect(mockShareService.createShareLink).toHaveBeenCalledWith(taskListId);
  });
});