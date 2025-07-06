import { Request, Response, NextFunction } from 'express';
import { CollaborativeService } from './collaborative.service';
import { sendSuccess } from '@/shared/utils/response';
import { validateRequest } from '@/shared/utils/validation';
import {
  collaborativeSessionSchema,
  updateSchema,
} from '@/shared/utils/validation';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

interface CollaborativeRequest extends AuthenticatedRequest {
  params: {
    taskListId: string;
  };
}

export class CollaborativeController {
  static async startSession(
    req: CollaborativeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const deviceId = req.header('X-Device-ID');

      if (!deviceId) {
        throw new Error('DEVICE_ID_REQUIRED');
      }

      const { sessionType } = validateRequest(
        collaborativeSessionSchema,
        req.body
      );

      const result = await CollaborativeService.startSession(
        taskListId,
        req.userId,
        deviceId,
        sessionType
      );

      sendSuccess(res, result, 'Session started successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getState(
    req: CollaborativeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const deviceId = req.header('X-Device-ID');

      if (!deviceId) {
        throw new Error('DEVICE_ID_REQUIRED');
      }

      const result = await CollaborativeService.getState(
        taskListId,
        req.userId,
        deviceId
      );

      sendSuccess(res, result, 'State retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async applyUpdate(
    req: CollaborativeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const deviceId = req.header('X-Device-ID');

      if (!deviceId) {
        throw new Error('DEVICE_ID_REQUIRED');
      }

      const { update } = validateRequest(updateSchema, req.body);

      const result = await CollaborativeService.applyUpdate(
        taskListId,
        req.userId,
        deviceId,
        update
      );

      sendSuccess(res, result, 'Update applied successfully');
    } catch (error) {
      next(error);
    }
  }

  static async keepAlive(
    req: CollaborativeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const deviceId = req.header('X-Device-ID');

      if (!deviceId) {
        throw new Error('DEVICE_ID_REQUIRED');
      }

      await CollaborativeService.keepAlive(
        taskListId,
        req.userId,
        deviceId
      );

      sendSuccess(res, { success: true }, 'Session kept alive');
    } catch (error) {
      next(error);
    }
  }

  static async endSession(
    req: CollaborativeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const deviceId = req.header('X-Device-ID');

      if (!deviceId) {
        throw new Error('DEVICE_ID_REQUIRED');
      }

      await CollaborativeService.endSession(
        taskListId,
        req.userId,
        deviceId
      );

      sendSuccess(res, { success: true }, 'Session ended successfully');
    } catch (error) {
      next(error);
    }
  }

  // TaskList management for collaborative operations
  static async getTaskList(
    req: CollaborativeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;

      const result = await CollaborativeService.getTaskList(
        taskListId,
        req.userId
      );

      sendSuccess(res, result, 'Task list retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createTaskList(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const result = await CollaborativeService.createTaskList(
        req.body,
        req.userId
      );

      sendSuccess(res, result, 'Task list created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateTaskList(
    req: CollaborativeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;

      const result = await CollaborativeService.updateTaskList(
        taskListId,
        req.body,
        req.userId
      );

      sendSuccess(res, result, 'Task list updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteTaskList(
    req: CollaborativeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;

      await CollaborativeService.deleteTaskList(taskListId, req.userId);

      sendSuccess(res, { success: true }, 'Task list deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}