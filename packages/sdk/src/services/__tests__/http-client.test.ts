import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClientImpl } from '../base/http-client';

// fetchをモック
global.fetch = vi.fn();

describe('HttpClient 自動トークンリフレッシュ機能', () => {
  let httpClient: HttpClientImpl;
  let mockGetAuthToken: ReturnType<typeof vi.fn>;
  let mockOnUnauthorized: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthToken = vi.fn();
    mockOnUnauthorized = vi.fn();
    
    httpClient = new HttpClientImpl({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      retries: 3,
      getAuthToken: mockGetAuthToken,
      onUnauthorized: mockOnUnauthorized
    });
  });

  it('認証ヘッダーが自動的に設定される', async () => {
    // Arrange
    const mockToken = 'test-access-token';
    mockGetAuthToken.mockResolvedValue(mockToken);
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { test: 'data' }, message: 'Success' })
    });

    // Act
    await httpClient.get('/test');

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`
        })
      })
    );
  });

  it('トークンがない場合、認証ヘッダーが設定されない', async () => {
    // Arrange
    mockGetAuthToken.mockResolvedValue(null);
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { test: 'data' }, message: 'Success' })
    });

    // Act
    await httpClient.get('/test');

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'Authorization': expect.any(String)
        })
      })
    );
  });

  it('401エラー時に自動リフレッシュが実行され、元のリクエストが再実行される', async () => {
    // Arrange
    const mockToken = 'test-access-token';
    const mockNewToken = 'new-access-token';
    
    mockGetAuthToken
      .mockResolvedValueOnce(mockToken)     // 最初のリクエスト
      .mockResolvedValueOnce(mockNewToken); // リフレッシュ後のリクエスト
    
    mockOnUnauthorized.mockResolvedValue(undefined);

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { test: 'data' }, message: 'Success' })
      });

    // Act
    const result = await httpClient.get('/protected');

    // Assert
    expect(mockOnUnauthorized).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    // 最初のリクエスト（古いトークン）
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/protected',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`
        })
      })
    );
    
    // 2回目のリクエスト（新しいトークン）
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/protected',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockNewToken}`
        })
      })
    );
    
    expect(result).toEqual({ data: { test: 'data' }, message: 'Success' });
  });

  it('リフレッシュ失敗時に認証エラーが発生する', async () => {
    // Arrange
    const mockToken = 'test-access-token';
    mockGetAuthToken.mockResolvedValue(mockToken);
    mockOnUnauthorized.mockRejectedValue(new Error('Refresh failed'));

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized')
    });

    // Act & Assert
    await expect(httpClient.get('/protected')).rejects.toThrow('Authentication failed');
    expect(mockOnUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('401エラー以外のHTTPエラーではリフレッシュが実行されない', async () => {
    // Arrange
    const mockToken = 'test-access-token';
    mockGetAuthToken.mockResolvedValue(mockToken);

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden')
    });

    // Act & Assert
    await expect(httpClient.get('/forbidden')).rejects.toThrow();
    expect(mockOnUnauthorized).not.toHaveBeenCalled();
  }, 10000); // タイムアウトを10秒に設定

  it('onUnauthorizedが設定されていない場合、401エラーでリフレッシュが実行されない', async () => {
    // Arrange
    const httpClientWithoutRefresh = new HttpClientImpl({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      retries: 3,
      getAuthToken: mockGetAuthToken
      // onUnauthorized は設定しない
    });

    mockGetAuthToken.mockResolvedValue('test-token');

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized')
    });

    // Act & Assert
    await expect(httpClientWithoutRefresh.get('/protected')).rejects.toThrow();
    expect(mockOnUnauthorized).not.toHaveBeenCalled();
  }, 10000); // タイムアウトを10秒に設定
});