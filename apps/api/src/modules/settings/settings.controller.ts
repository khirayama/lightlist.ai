import { Request, Response, NextFunction } from 'express';
import { SettingsService } from './settings.service';
import { sendSuccess } from '@/shared/utils/response';
import { validateRequest } from '@/shared/utils/validation';
import { settingsSchema, appSchema, taskListOrderSchema } from '@/shared/utils/validation';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

export class SettingsController {
  static async getSettings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const settings = await SettingsService.getSettings(req.userId);

      sendSuccess(res, settings, 'Settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const data = validateRequest(settingsSchema, req.body);

      const settings = await SettingsService.updateSettings(req.userId, data);

      sendSuccess(res, settings, 'Settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getApp(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const app = await SettingsService.getApp(req.userId);

      sendSuccess(res, app, 'App settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateApp(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const data = validateRequest(appSchema, req.body);

      const app = await SettingsService.updateApp(req.userId, data);

      sendSuccess(res, app, 'App settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTaskListOrder(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const taskListOrder = await SettingsService.getTaskListOrder(req.userId);

      sendSuccess(res, taskListOrder, 'Task list order retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateTaskListOrder(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { order } = validateRequest(taskListOrderSchema, req.body);

      await SettingsService.updateTaskListOrder(req.userId, order);

      sendSuccess(res, null, 'Task list order updated successfully');
    } catch (error) {
      next(error);
    }
  }
}