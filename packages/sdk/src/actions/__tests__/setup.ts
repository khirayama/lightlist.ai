import { beforeEach, afterEach, vi } from 'vitest';
import { 
  AuthSession, 
  UserSettings, 
  AppSettings, 
  TaskList, 
  Task, 
  TaskListShare, 
  AppError, 
  ActionResult,
  StoreState
} from '../../types';

// テスト用のモックデータ
export const mockAuthSession: AuthSession = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
  deviceId: 'mock-device-id'
};

export const mockUserSettings: UserSettings = {
  theme: 'system',
  language: 'ja'
};

export const mockAppSettings: AppSettings = {
  id: 'mock-app-id',
  taskInsertPosition: 'top',
  autoSort: false
};

export const mockTask: Task = {
  id: 'mock-task-id',
  text: 'Mock Task',
  completed: false,
  date: '2024-01-01',
  taskListId: 'mock-tasklist-id',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export const mockTaskList: TaskList = {
  id: 'mock-tasklist-id',
  name: 'Mock Task List',
  background: '#FF0000',
  tasks: [mockTask],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export const mockTaskListShare: TaskListShare = {
  taskListId: 'mock-tasklist-id',
  shareToken: 'mock-share-token',
  shareUrl: 'https://example.com/share/mock-share-token',
  isActive: true
};

export const mockAppError: AppError = {
  type: 'network',
  code: 'NETWORK_ERROR',
  message: 'Network request failed',
  details: { status: 500 }
};

export const mockStoreState: StoreState = {
  user: null,
  app: mockAppSettings,
  settings: mockUserSettings,
  taskLists: [mockTaskList],
  activeSessionIds: [],
  syncStatus: {
    pending: [],
    syncing: [],
    failed: [],
    lastSync: {}
  },
  errors: []
};

// Services のモック
export const mockAuthService = {
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  deleteUser: vi.fn(),
  updateEmail: vi.fn(),
  updatePassword: vi.fn(),
  sendPasswordResetRequest: vi.fn(),
  resetPassword: vi.fn(),
  bootstrap: vi.fn()
} as any;

export const mockSettingsService = {
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getApp: vi.fn(),
  updateApp: vi.fn(),
  getTaskListOrder: vi.fn(),
  updateTaskListOrder: vi.fn()
} as any;

export const mockCollaborativeService = {
  createTaskListDocument: vi.fn(),
  getTaskListDocument: vi.fn(),
  updateTaskListDocument: vi.fn(),
  deleteTaskListDocument: vi.fn(),
  startSession: vi.fn(),
  endSession: vi.fn(),
  sendUpdate: vi.fn(),
  getUpdates: vi.fn(),
  keepAlive: vi.fn(),
  // Task関連のメソッド
  createTaskInDocument: vi.fn(),
  updateTaskInDocument: vi.fn(),
  deleteTaskInDocument: vi.fn(),
  moveTaskInDocument: vi.fn(),
  sortTasksInDocument: vi.fn(),
  clearCompletedTasksInDocument: vi.fn()
} as any;

export const mockShareService = {
  createShareLink: vi.fn(),
  getSharedTaskList: vi.fn(),
  copySharedTaskList: vi.fn(),
  removeShareLink: vi.fn(),
  refreshShareCode: vi.fn()
} as any;

// Store のモック
export const mockStore = {
  getState: vi.fn(),
  setState: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  dispatch: vi.fn(),
  destroy: vi.fn()
} as any;

// ActionResult ヘルパー関数
export function createSuccessResult<T>(data: T): ActionResult<T> {
  return {
    success: true,
    data
  };
}

export function createFailureResult<T>(error: AppError): ActionResult<T> {
  return {
    success: false,
    error
  };
}

// t-wada式TDDのためのテストヘルパー関数
export function expectActionSuccess<T>(result: ActionResult<T>): T {
  if (!result.success) {
    throw new Error(`Expected action to succeed, but it failed: ${result.error?.message}`);
  }
  return result.data as T;
}

export function expectActionFailure<T>(result: ActionResult<T>): AppError {
  if (result.success) {
    throw new Error('Expected action to fail, but it succeeded');
  }
  return result.error as AppError;
}

// セットアップ・クリーンアップ関数
export function setupActionsTests() {
  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();
    
    // デフォルトのモック設定
    mockStore.getState.mockReturnValue(mockStoreState);
    mockStore.subscribe.mockReturnValue(() => {});
    
    // Services のデフォルト設定
    mockAuthService.register.mockResolvedValue(mockAuthSession);
    mockAuthService.login.mockResolvedValue(mockAuthSession);
    mockAuthService.logout.mockResolvedValue(undefined);
    mockAuthService.bootstrap.mockResolvedValue(undefined);
    
    mockSettingsService.getSettings.mockResolvedValue(mockUserSettings);
    mockSettingsService.updateSettings.mockResolvedValue(mockUserSettings);
    mockSettingsService.getApp.mockResolvedValue(mockAppSettings);
    mockSettingsService.updateApp.mockResolvedValue(mockAppSettings);
    mockSettingsService.getTaskListOrder.mockResolvedValue([]);
    mockSettingsService.updateTaskListOrder.mockResolvedValue(undefined);
    
    mockCollaborativeService.createTaskListDocument.mockResolvedValue(mockTaskList);
    mockCollaborativeService.getTaskListDocument.mockResolvedValue(mockTaskList);
    mockCollaborativeService.updateTaskListDocument.mockResolvedValue(mockTaskList);
    mockCollaborativeService.deleteTaskListDocument.mockResolvedValue(undefined);
    mockCollaborativeService.startSession.mockResolvedValue(undefined);
    mockCollaborativeService.endSession.mockResolvedValue(undefined);
    
    // Task関連のデフォルト設定
    mockCollaborativeService.createTaskInDocument.mockResolvedValue(mockTask);
    mockCollaborativeService.updateTaskInDocument.mockResolvedValue(mockTask);
    mockCollaborativeService.deleteTaskInDocument.mockResolvedValue(undefined);
    mockCollaborativeService.moveTaskInDocument.mockResolvedValue(undefined);
    mockCollaborativeService.sortTasksInDocument.mockResolvedValue(undefined);
    mockCollaborativeService.clearCompletedTasksInDocument.mockResolvedValue(undefined);
    
    mockShareService.createShareLink.mockResolvedValue(mockTaskListShare);
    mockShareService.getSharedTaskList.mockResolvedValue(mockTaskList);
    mockShareService.copySharedTaskList.mockResolvedValue(mockTaskList);
    mockShareService.removeShareLink.mockResolvedValue(undefined);
    mockShareService.refreshShareCode.mockResolvedValue(mockTaskListShare);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
}