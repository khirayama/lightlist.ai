import type { ApiError, ApiResponse } from '../types';

/**
 * HTTP メソッドの型定義
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * リクエストオプションの型定義
 */
interface RequestOptions {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
}

/**
 * APIクライアントのベースクラス
 */
export class BaseApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private deviceId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // 末尾のスラッシュを除去
  }

  /**
   * 認証情報を設定
   */
  setAuth(accessToken: string, refreshToken: string, deviceId: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.deviceId = deviceId;
  }

  /**
   * 認証情報をクリア
   */
  clearAuth(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.deviceId = null;
  }

  /**
   * 認証されているかチェック
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null && this.refreshToken !== null;
  }

  /**
   * アクセストークンを取得
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * リフレッシュトークンを取得
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * デバイスIDを取得
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * HTTPリクエストを実行
   */
  protected async request<T = any>(
    endpoint: string,
    options: RequestOptions = { method: 'GET' }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const { method, headers = {}, body, requiresAuth = false } = options;

    // 認証が必要な場合のチェック
    if (requiresAuth && !this.isAuthenticated()) {
      throw new Error('Authentication required');
    }

    // ヘッダーの設定
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // 認証トークンの追加
    if (requiresAuth && this.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // リクエストボディの準備
    const requestBody = body ? JSON.stringify(body) : undefined;

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
      });

      // 401エラーの場合、AuthContextで管理するため自動リフレッシュは無効化
      if (response.status === 401 && requiresAuth) {
        const error = await response.json() as ApiError;
        throw new ApiClientError(error.error || 'Unauthorized', 401, error.details);
      }

      // レスポンスの処理
      const responseData = await response.json();

      if (!response.ok) {
        const error = responseData as ApiError;
        throw new ApiClientError(error.error, response.status, error.details);
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      
      // ネットワークエラーなどの場合
      throw new ApiClientError(
        'Network error or server unavailable',
        0,
        [error instanceof Error ? error.message : 'Unknown error']
      );
    }
  }


  /**
   * GET リクエスト
   */
  protected async get<T = any>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth });
  }

  /**
   * POST リクエスト
   */
  protected async post<T = any>(
    endpoint: string,
    body?: any,
    requiresAuth = false
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, requiresAuth });
  }

  /**
   * PUT リクエスト
   */
  protected async put<T = any>(
    endpoint: string,
    body?: any,
    requiresAuth = false
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, requiresAuth });
  }

  /**
   * DELETE リクエスト
   */
  protected async delete<T = any>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth });
  }
}

/**
 * API クライアントエラークラス
 */
export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly details?: string[];

  constructor(message: string, statusCode: number, details?: string[]) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.details = details;
  }
}