import { Request, Response, NextFunction } from 'express';
import { ShareService } from '@/services/share';
import { sendSuccess } from '@/utils/response';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

interface ShareRequest extends AuthenticatedRequest {
  params: {
    taskListId: string;
  };
}

interface PublicShareRequest extends Request {
  params: {
    shareToken: string;
  };
}

export class ShareController {
  static async createShare(
    req: ShareRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const result = await ShareService.createShare(taskListId, req.userId);

      sendSuccess(res, result, 'Share link created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async deleteShare(
    req: ShareRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      await ShareService.deleteShare(taskListId, req.userId);

      sendSuccess(res, { success: true }, 'Share link deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getSharedTaskList(
    req: PublicShareRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { shareToken } = req.params;
      const result = await ShareService.getSharedTaskList(shareToken);

      sendSuccess(res, result, 'Shared task list retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async copySharedTaskList(
    req: PublicShareRequest & AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { shareToken } = req.params;
      const result = await ShareService.copySharedTaskList(
        shareToken,
        req.userId
      );

      sendSuccess(res, result, 'Task list copied successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}