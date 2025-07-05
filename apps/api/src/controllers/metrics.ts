import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '@/services/metrics';
import { sendSuccess } from '@/utils/response';

export class MetricsController {
  static async getBasicMetrics(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const metrics = await MetricsService.getMetrics();
      sendSuccess(res, metrics, 'Metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getDetailedMetrics(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const metrics = await MetricsService.getDetailedMetrics();
      sendSuccess(res, metrics, 'Detailed metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}