import { MonitoringService } from '../index';
import { ApiResponse } from '../../types';
import { ServiceBase } from '../base/service-base';
import { HttpClient } from '../base/http-client';

export class MonitoringServiceImpl extends ServiceBase implements MonitoringService {
  constructor(
    httpClient: HttpClient,
    private baseUrl: string
  ) {
    super(httpClient);
  }

  async getHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const response = await this.httpClient.get<{ status: string; timestamp: string }>('/health');
      
      // レスポンスの基本的な検証
      this.validateHealthResponse(response.data);
      
      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getMetrics(): Promise<ApiResponse<{ activeUsers: number; activeSessions: number }>> {
    try {
      const response = await this.httpClient.get<{ activeUsers: number; activeSessions: number }>('/metrics');
      
      // レスポンスの基本的な検証
      this.validateMetricsResponse(response.data);
      
      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  // プライベートメソッド
  private validateHealthResponse(data: { status: string; timestamp: string }): void {
    if (!data || typeof data !== 'object') {
      throw this.createError('validation', 'INVALID_HEALTH_RESPONSE', 'Health response must be an object');
    }

    if (!data.status || typeof data.status !== 'string') {
      throw this.createError('validation', 'INVALID_HEALTH_STATUS', 'Health status must be a string');
    }

    if (!data.timestamp || typeof data.timestamp !== 'string') {
      throw this.createError('validation', 'INVALID_HEALTH_TIMESTAMP', 'Health timestamp must be a string');
    }

    // タイムスタンプの形式チェック（ISO 8601形式）
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    if (!timestampRegex.test(data.timestamp)) {
      throw this.createError('validation', 'INVALID_TIMESTAMP_FORMAT', 'Timestamp must be in ISO 8601 format');
    }
  }

  private validateMetricsResponse(data: { activeUsers: number; activeSessions: number }): void {
    if (!data || typeof data !== 'object') {
      throw this.createError('validation', 'INVALID_METRICS_RESPONSE', 'Metrics response must be an object');
    }

    if (typeof data.activeUsers !== 'number' || data.activeUsers < 0 || !Number.isInteger(data.activeUsers)) {
      throw this.createError('validation', 'INVALID_ACTIVE_USERS', 'Active users must be a non-negative integer');
    }

    if (typeof data.activeSessions !== 'number' || data.activeSessions < 0 || !Number.isInteger(data.activeSessions)) {
      throw this.createError('validation', 'INVALID_ACTIVE_SESSIONS', 'Active sessions must be a non-negative integer');
    }

    // 論理的な制約チェック（セッション数がユーザー数を大幅に上回らないことを確認）
    // ただし、1ユーザーが複数セッションを持つ可能性があるため、緩い制約とする
    if (data.activeSessions > data.activeUsers * 10) {
      console.warn('Warning: Active sessions count seems unusually high compared to active users');
    }
  }
}