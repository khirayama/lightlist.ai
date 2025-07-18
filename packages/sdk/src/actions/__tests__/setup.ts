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
  taskListOrder: ['mock-tasklist-id'],
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
  bootstrap: vi.fn(),
  getAccessToken: vi.fn()
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
  getTaskLists: vi.fn(), // 追加
  initializeTaskList: vi.fn(), // 追加
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

// ApiResponse ヘルパー関数
export function createApiResponse<T>(data: T, message: string = 'Success'): { data: T; message: string } {
  return {
    data,
    message
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
    mockAuthService.register.mockResolvedValue(createApiResponse(mockAuthSession));
    mockAuthService.login.mockResolvedValue(createApiResponse(mockAuthSession));
    mockAuthService.logout.mockResolvedValue(createApiResponse(undefined));
    mockAuthService.bootstrap.mockResolvedValue(createApiResponse(undefined));
    mockAuthService.getAccessToken.mockReturnValue('mock-access-token');
    
    mockSettingsService.getSettings.mockResolvedValue(createApiResponse(mockUserSettings));
    // updateSettings と updateApp のモックは各テストで個別に設定
    mockSettingsService.getApp.mockResolvedValue(createApiResponse(mockAppSettings));
    mockSettingsService.getTaskListOrder.mockResolvedValue(createApiResponse([]));
    mockSettingsService.updateTaskListOrder.mockResolvedValue(createApiResponse(undefined));
    
    mockCollaborativeService.createTaskListDocument.mockResolvedValue(createApiResponse(mockTaskList));
    mockCollaborativeService.getTaskListDocument.mockResolvedValue(createApiResponse(mockTaskList));
    mockCollaborativeService.updateTaskListDocument.mockResolvedValue(createApiResponse(undefined));
    mockCollaborativeService.deleteTaskListDocument.mockResolvedValue(createApiResponse(undefined));
    mockCollaborativeService.startSession.mockResolvedValue(createApiResponse(undefined));
    mockCollaborativeService.endSession.mockResolvedValue(createApiResponse(undefined));
    mockCollaborativeService.getTaskLists.mockResolvedValue(createApiResponse([mockTaskList]));
    mockCollaborativeService.initializeTaskList.mockResolvedValue(createApiResponse(mockTaskList));
    
    // Task関連のデフォルト設定
    mockCollaborativeService.createTaskInDocument.mockResolvedValue(createApiResponse(mockTask));
    mockCollaborativeService.updateTaskInDocument.mockResolvedValue(createApiResponse(undefined));
    mockCollaborativeService.deleteTaskInDocument.mockResolvedValue(createApiResponse(undefined));
    mockCollaborativeService.moveTaskInDocument.mockResolvedValue(createApiResponse(undefined));
    mockCollaborativeService.sortTasksInDocument.mockResolvedValue(createApiResponse(undefined));
    mockCollaborativeService.clearCompletedTasksInDocument.mockResolvedValue(createApiResponse(undefined));
    
    mockShareService.createShareLink.mockResolvedValue(createApiResponse(mockTaskListShare));
    mockShareService.getSharedTaskList.mockResolvedValue(createApiResponse(mockTaskList));
    mockShareService.copySharedTaskList.mockResolvedValue(createApiResponse(mockTaskList));
    mockShareService.removeShareLink.mockResolvedValue(createApiResponse(undefined));
    mockShareService.refreshShareCode.mockResolvedValue(createApiResponse(mockTaskListShare));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
}