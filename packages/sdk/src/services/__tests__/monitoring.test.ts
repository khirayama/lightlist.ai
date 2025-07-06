import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonitoringService } from '../index';
import { MonitoringServiceImpl } from '../monitoring.service';
import { setupServiceTests, mockHttpClient, TEST_BASE_URL } from './setup';

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  setupServiceTests();

  beforeEach(() => {
    monitoringService = new MonitoringServiceImpl(mockHttpClient, TEST_BASE_URL);
  });

  describe('システム監視', () => {
    describe('getHealth', () => {
      it('ヘルスチェックが成功する', async () => {
        // Arrange
        const mockHealthData = {
          status: 'healthy',
          timestamp: '2024-01-01T12:00:00Z'
        };
        
        mockHttpClient.get.mockResolvedValue({
          data: mockHealthData,
          message: 'System is healthy'
        });

        // Act
        const result = await monitoringService.getHealth();

        // Assert
        expect(result.data).toEqual(mockHealthData);
        expect(result.message).toBe('System is healthy');
        expect(mockHttpClient.get).toHaveBeenCalledWith('/health');
      });

      it('システムが不健全な状態でも正常にレスポンスを返す', async () => {
        // Arrange
        const mockHealthData = {
          status: 'unhealthy',
          timestamp: '2024-01-01T12:00:00Z'
        };
        
        mockHttpClient.get.mockResolvedValue({
          data: mockHealthData,
          message: 'System has issues'
        });

        // Act
        const result = await monitoringService.getHealth();

        // Assert
        expect(result.data.status).toBe('unhealthy');
        expect(result.data.timestamp).toBe('2024-01-01T12:00:00Z');
      });

      it('ネットワークエラーでエラーが発生する', async () => {
        // Arrange
        mockHttpClient.get.mockRejectedValue(new Error('Network error'));

        // Act & Assert
        await expect(monitoringService.getHealth()).rejects.toThrow('Network error');
      });
    });

    describe('getMetrics', () => {
      it('メトリクスの取得が成功する', async () => {
        // Arrange
        const mockMetricsData = {
          activeUsers: 150,
          activeSessions: 45
        };
        
        mockHttpClient.get.mockResolvedValue({
          data: mockMetricsData,
          message: 'Metrics retrieved successfully'
        });

        // Act
        const result = await monitoringService.getMetrics();

        // Assert
        expect(result.data).toEqual(mockMetricsData);
        expect(result.message).toBe('Metrics retrieved successfully');
        expect(mockHttpClient.get).toHaveBeenCalledWith('/metrics');
      });

      it('メトリクスが0でも正常に取得できる', async () => {
        // Arrange
        const mockMetricsData = {
          activeUsers: 0,
          activeSessions: 0
        };
        
        mockHttpClient.get.mockResolvedValue({
          data: mockMetricsData,
          message: 'Metrics retrieved successfully'
        });

        // Act
        const result = await monitoringService.getMetrics();

        // Assert
        expect(result.data.activeUsers).toBe(0);
        expect(result.data.activeSessions).toBe(0);
      });

      it('大きな数値のメトリクスも正常に処理できる', async () => {
        // Arrange
        const mockMetricsData = {
          activeUsers: 1000000,
          activeSessions: 500000
        };
        
        mockHttpClient.get.mockResolvedValue({
          data: mockMetricsData,
          message: 'Metrics retrieved successfully'
        });

        // Act
        const result = await monitoringService.getMetrics();

        // Assert
        expect(result.data.activeUsers).toBe(1000000);
        expect(result.data.activeSessions).toBe(500000);
      });

      it('認証エラーでエラーが発生する', async () => {
        // Arrange
        mockHttpClient.get.mockRejectedValue(new Error('Unauthorized'));

        // Act & Assert
        await expect(monitoringService.getMetrics()).rejects.toThrow('Unauthorized');
      });

      it('権限不足でエラーが発生する', async () => {
        // Arrange
        mockHttpClient.get.mockRejectedValue(new Error('Forbidden'));

        // Act & Assert
        await expect(monitoringService.getMetrics()).rejects.toThrow('Forbidden');
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('サーバーエラー（500）を適切に処理する', async () => {
      // Arrange
      mockHttpClient.get.mockRejectedValue(new Error('Internal Server Error'));

      // Act & Assert
      await expect(monitoringService.getHealth()).rejects.toThrow('Internal Server Error');
      await expect(monitoringService.getMetrics()).rejects.toThrow('Internal Server Error');
    });

    it('タイムアウトエラーを適切に処理する', async () => {
      // Arrange
      mockHttpClient.get.mockRejectedValue(new Error('Request timeout'));

      // Act & Assert
      await expect(monitoringService.getHealth()).rejects.toThrow('Request timeout');
      await expect(monitoringService.getMetrics()).rejects.toThrow('Request timeout');
    });

    it('予期しないレスポンス形式でもエラーを適切に処理する', async () => {
      // Arrange
      mockHttpClient.get.mockResolvedValue({
        // data プロパティがない不正なレスポンス
        message: 'Invalid response format'
      } as any);

      // Act & Assert
      await expect(monitoringService.getHealth()).rejects.toThrow();
      await expect(monitoringService.getMetrics()).rejects.toThrow();
    });
  });

  describe('レスポンス形式', () => {
    it('ヘルスチェックレスポンスが正しい形式である', async () => {
      // Arrange
      const mockHealthData = {
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z'
      };
      
      mockHttpClient.get.mockResolvedValue({
        data: mockHealthData,
        message: 'System is healthy'
      });

      // Act
      const result = await monitoringService.getHealth();

      // Assert
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('timestamp');
      expect(typeof result.data.status).toBe('string');
      expect(typeof result.data.timestamp).toBe('string');
    });

    it('メトリクスレスポンスが正しい形式である', async () => {
      // Arrange
      const mockMetricsData = {
        activeUsers: 150,
        activeSessions: 45
      };
      
      mockHttpClient.get.mockResolvedValue({
        data: mockMetricsData,
        message: 'Metrics retrieved successfully'
      });

      // Act
      const result = await monitoringService.getMetrics();

      // Assert
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result.data).toHaveProperty('activeUsers');
      expect(result.data).toHaveProperty('activeSessions');
      expect(typeof result.data.activeUsers).toBe('number');
      expect(typeof result.data.activeSessions).toBe('number');
    });
  });
});