import { beforeEach, afterEach, vi } from 'vitest';
import { ApiResponse, AuthSession, AppError } from '../../types';

// テスト用のモック設定
export const mockApiResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  message: 'Success'
});

export const mockAuthSession: AuthSession = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
  deviceId: 'mock-device-id'
};

export const mockAppError: AppError = {
  type: 'network',
  code: 'NETWORK_ERROR',
  message: 'Network request failed',
  details: { status: 500 }
};

// HTTPクライアントのモック
export const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
};

// ローカルストレージのモック（Web/Native両対応）
export const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// テスト用のベースURL
export const TEST_BASE_URL = 'http://localhost:3001';

// セットアップ・クリーンアップ関数
export function setupServiceTests() {
  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();
    
    // デフォルトのモック設定
    mockHttpClient.get.mockResolvedValue(mockApiResponse({}));
    mockHttpClient.post.mockResolvedValue(mockApiResponse({}));
    mockHttpClient.put.mockResolvedValue(mockApiResponse({}));
    mockHttpClient.patch.mockResolvedValue(mockApiResponse({}));
    mockHttpClient.delete.mockResolvedValue(mockApiResponse({}));
    
    mockStorage.getItem.mockReturnValue(null);
    mockStorage.setItem.mockReturnValue(undefined);
    mockStorage.removeItem.mockReturnValue(undefined);
    mockStorage.clear.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
}

// t-wada式TDDのためのテストヘルパー関数
export function expectFailure<T>(promise: Promise<T>): Promise<Error> {
  return promise.then(
    () => { throw new Error('Expected promise to fail, but it succeeded'); },
    (error) => error
  );
}

export function expectSuccess<T>(promise: Promise<T>): Promise<T> {
  return promise.then(
    (result) => result,
    (error) => { throw new Error(`Expected promise to succeed, but it failed: ${error.message}`); }
  );
}

// APIエラーレスポンスの作成ヘルパー
export function createApiErrorResponse(status: number, message: string) {
  const error = new Error(message);
  (error as any).status = status;
  return error;
}