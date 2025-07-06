import { ApiResponse, AppError } from '../../types';

// HTTPクライアントのインターフェース
export interface HttpClient {
  get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>>;
}

// リクエストオプション
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// HTTPクライアント設定
export interface HttpClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  getAuthToken?: () => Promise<string | null>;
  onUnauthorized?: () => Promise<void>;
}

// HTTPクライアント実装
export class HttpClientImpl implements HttpClient {
  constructor(private config: HttpClientConfig) {}

  async get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, options);
  }

  async put<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, options);
  }

  async patch<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, options);
  }

  async delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
    
    const maxRetries = options?.retries ?? this.config.retries;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers = await this.buildHeaders(options?.headers);
        
        const requestOptions: RequestInit = {
          method,
          headers,
          body: data ? JSON.stringify(data) : null,
          signal: AbortSignal.timeout(options?.timeout || this.config.timeout),
        };

        const response = await fetch(fullUrl, requestOptions);
        
        if (!response.ok) {
          if (response.status === 401 && this.config.onUnauthorized) {
            try {
              await this.config.onUnauthorized();
              // リフレッシュ成功時、元のリクエストを再実行
              continue;
            } catch (refreshError) {
              // リフレッシュ失敗時は認証エラーとして処理
              throw this.createError('auth', 'UNAUTHORIZED', 'Authentication failed');
            }
          }
          
          let errorMessage = `HTTP ${response.status}`;
          let errorDetails: any = {
            status: response.status,
            statusText: response.statusText
          };
          
          try {
            // APIエラーレスポンスをJSONとしてパース
            const errorJson = await response.json();
            if (errorJson && errorJson.message) {
              errorMessage = errorJson.message;
              errorDetails = { ...errorDetails, ...errorJson };
            }
          } catch (parseError) {
            // JSONパースに失敗した場合はテキストとして取得
            try {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            } catch (textError) {
              // テキスト取得も失敗した場合はHTTPステータスのみ
            }
          }
          
          throw this.createError('network', 'HTTP_ERROR', errorMessage, errorDetails);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        // 401エラーでリフレッシュが成功した場合は、continueでリトライ
        if (error && typeof error === 'object' && 'type' in error && error.type === 'auth') {
          throw error;
        }
        
        if (attempt === maxRetries) {
          if (error instanceof Error) {
            throw error;
          }
          throw this.createError('network', 'NETWORK_ERROR', 'Network request failed', { error });
        }
        
        // 指数バックオフによるリトライ
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw this.createError('network', 'MAX_RETRIES_EXCEEDED', 'Maximum retries exceeded');
  }

  private async buildHeaders(customHeaders?: Record<string, string>): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    if (this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private createError(type: AppError['type'], code: string, message: string, details?: any): AppError {
    return {
      type,
      code,
      message,
      details
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}