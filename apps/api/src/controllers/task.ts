import { Request, Response, NextFunction } from 'express';
import { TaskService } from '@/services/task';
import { sendSuccess } from '@/utils/response';
import { validateRequest } from '@/utils/validation';
import {
  taskCreateSchema,
  taskUpdateSchema,
} from '@/utils/validation';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

interface TaskRequest extends AuthenticatedRequest {
  params: {
    taskId: string;
  };
}

interface TaskListTaskRequest extends AuthenticatedRequest {
  params: {
    taskListId: string;
  };
}

export class TaskController {
  static async getTaskListTasks(
    req: TaskListTaskRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const tasks = await TaskService.getUserTaskListTasks(
        taskListId,
        req.userId
      );

      sendSuccess(res, tasks, 'Tasks retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTask(
    req: TaskRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskId } = req.params;
      const task = await TaskService.getTask(taskId, req.userId);

      sendSuccess(res, task, 'Task retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createTask(
    req: TaskListTaskRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const data = validateRequest(taskCreateSchema, req.body);
      const task = await TaskService.createTask(taskListId, req.userId, data);

      sendSuccess(res, task, 'Task created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateTask(
    req: TaskRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskId } = req.params;
      const data = validateRequest(taskUpdateSchema, req.body);
      const task = await TaskService.updateTask(taskId, req.userId, data);

      sendSuccess(res, task, 'Task updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteTask(
    req: TaskRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskId } = req.params;
      const result = await TaskService.deleteTask(taskId, req.userId);

      sendSuccess(res, result, 'Task deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateTaskOrder(
    req: TaskListTaskRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new Error('USER_NOT_FOUND');
      }

      const { taskListId } = req.params;
      const { taskOrder } = req.body;

      if (!Array.isArray(taskOrder)) {
        throw new Error('INVALID_TASK_ORDER');
      }

      const result = await TaskService.updateTaskOrder(
        taskListId,
        req.userId,
        taskOrder
      );

      sendSuccess(res, { taskOrder: result }, 'Task order updated successfully');
    } catch (error) {
      next(error);
    }
  }
}