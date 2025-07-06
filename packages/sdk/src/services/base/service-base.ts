import { HttpClient } from './http-client';
import { ApiResponse, AppError } from '../../types';

// サービスベースクラス
export abstract class ServiceBase {
  constructor(protected httpClient: HttpClient) {}

  // 共通エラーハンドリング
  protected handleError(error: any): never {
    if (error && typeof error === 'object' && 'type' in error) {
      // 既にAppErrorの場合はそのまま投げる
      console.log('ServiceBase - AppError passed through:', error);
      throw error as AppError;
    }

    if (error instanceof Error) {
      console.log('ServiceBase - Converting Error to AppError:', error.message);
      // 一般的なエラーをAppErrorに変換
      throw this.createError('unknown', 'UNKNOWN_ERROR', error.message, { originalError: error });
    }

    console.log('ServiceBase - Unexpected error type:', typeof error, error);
    // 予期しないエラー
    throw this.createError('unknown', 'UNEXPECTED_ERROR', 'An unexpected error occurred', { error });
  }

  // エラー作成ヘルパー
  protected createError(type: AppError['type'], code: string, message: string, details?: any): AppError {
    return {
      type,
      code,
      message,
      details
    };
  }

  // APIレスポンスの検証
  protected validateResponse<T>(response: ApiResponse<T>): T {
    if (!response || typeof response !== 'object' || !('data' in response)) {
      throw this.createError('validation', 'INVALID_RESPONSE', 'Invalid API response format');
    }
    return response.data;
  }

  // 成功レスポンスの作成
  protected createSuccessResponse<T>(data: T, message: string = 'Success'): ApiResponse<T> {
    return {
      data,
      message
    };
  }

  // パスパラメータの検証
  protected validatePathParam(param: string, name: string): void {
    if (!param || typeof param !== 'string' || param.trim() === '') {
      throw this.createError('validation', 'INVALID_PATH_PARAM', `Invalid ${name} parameter`);
    }
  }

  // リクエストボディの検証
  protected validateRequestBody(body: any, requiredFields: string[]): void {
    if (!body || typeof body !== 'object') {
      throw this.createError('validation', 'INVALID_REQUEST_BODY', 'Request body must be an object');
    }

    for (const field of requiredFields) {
      if (!(field in body) || body[field] === undefined || body[field] === null) {
        throw this.createError('validation', 'MISSING_REQUIRED_FIELD', `Missing required field: ${field}`);
      }
    }
  }

  // デバイスIDの検証
  protected validateDeviceId(deviceId: string): void {
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
      throw this.createError('validation', 'INVALID_DEVICE_ID', 'Device ID is required');
    }
  }

  // Eメールアドレスの検証
  protected validateEmail(email: string): void {
    if (!email || typeof email !== 'string') {
      throw this.createError('validation', 'INVALID_EMAIL', 'Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw this.createError('validation', 'INVALID_EMAIL_FORMAT', 'Invalid email format');
    }
  }

  // パスワードの検証
  protected validatePassword(password: string): void {
    if (!password || typeof password !== 'string') {
      throw this.createError('validation', 'INVALID_PASSWORD', 'Password is required');
    }

    if (password.length < 8) {
      throw this.createError('validation', 'PASSWORD_TOO_SHORT', 'Password must be at least 8 characters long');
    }
  }
}