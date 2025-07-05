import { Request, Response, NextFunction } from 'express';
import { TaskListService } from '@/services/taskList';
import { sendSuccess } from '@/utils/response';
import { validateRequest } from '@/utils/validation';
import {
  taskListCreateSchema,
  taskListUpdateSchema,
} from '@/utils/validation';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

interface TaskListRequest extends AuthenticatedRequest {
  params: {
    taskListId: string;
  };
}

export class TaskListController {
  static async getUserTaskLists(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const taskLists = await TaskListService.getUserTaskLists(req.userId);

      sendSuccess(res, taskLists, 'Task lists retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTaskList(
    req: TaskListRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const taskList = await TaskListService.getTaskList(
        taskListId,
        req.userId
      );

      sendSuccess(res, taskList, 'Task list retrieved successfully');
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

      const data = validateRequest(taskListCreateSchema, req.body);
      const taskList = await TaskListService.createTaskList(req.userId, data);

      sendSuccess(res, taskList, 'Task list created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateTaskList(
    req: TaskListRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const data = validateRequest(taskListUpdateSchema, req.body);
      const taskList = await TaskListService.updateTaskList(
        taskListId,
        req.userId,
        data
      );

      sendSuccess(res, taskList, 'Task list updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteTaskList(
    req: TaskListRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const result = await TaskListService.deleteTaskList(
        taskListId,
        req.userId
      );

      sendSuccess(res, result, 'Task list deleted successfully');
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

      const { taskListOrder } = req.body;

      if (!Array.isArray(taskListOrder)) {
        throw new Error('INVALID_TASK_LIST_ORDER');
      }

      const result = await TaskListService.updateTaskListOrder(
        req.userId,
        taskListOrder
      );

      sendSuccess(res, { taskListOrder: result }, 'Task list order updated successfully');
    } catch (error) {
      next(error);
    }
  }
}