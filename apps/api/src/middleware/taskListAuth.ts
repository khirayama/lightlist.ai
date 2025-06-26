import type { Response, NextFunction } from 'express';
import { getDatabase } from '../services/database';
import type { AuthenticatedRequest } from '../types/auth';

/**
 * タスクリストへのアクセス権限をチェックするミドルウェア
 * リクエストに taskList と app 情報を追加する
 */
export const checkTaskListAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskListId } = req.params;
    const userId = req.userId as string;

    if (!taskListId) {
      res.status(400).json({
        error: 'Task list ID is required',
      });
      return;
    }

    const prisma = getDatabase();

    // ユーザーのAppとタスクリストを一度に取得（最適化）
    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        taskListOrder: true,
        taskInsertPosition: true,
        autoSort: true,
      },
    });

    if (!app || !app.taskListOrder.includes(taskListId)) {
      res.status(404).json({
        error: 'Task list not found',
      });
      return;
    }

    // タスクリストの詳細情報を取得
    const taskList = await prisma.taskList.findUnique({
      where: { id: taskListId },
      select: {
        id: true,
        name: true,
        background: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!taskList) {
      res.status(404).json({
        error: 'Task list not found',
      });
      return;
    }

    // リクエストオブジェクトに情報を追加
    req.appData = app;
    req.taskList = taskList;

    next();
  } catch (error) {
    console.error('Task list access check error:', error);
    res.status(500).json({
      error: 'Internal server error during access check',
    });
  }
};

/**
 * タスクへのアクセス権限をチェックするミドルウェア
 * リクエストに task、taskList、app 情報を追加する
 */
export const checkTaskAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId as string;

    if (!taskId) {
      res.status(400).json({
        error: 'Task ID is required',
      });
      return;
    }

    const prisma = getDatabase();

    // タスク、タスクリスト、ユーザーAppを一度に取得（最適化）
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        text: true,
        completed: true,
        date: true,
        taskListId: true,
        createdAt: true,
        updatedAt: true,
        taskList: {
          select: {
            id: true,
            name: true,
            background: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({
        error: 'Task not found',
      });
      return;
    }

    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        taskListOrder: true,
        taskInsertPosition: true,
        autoSort: true,
      },
    });

    if (!app || !app.taskListOrder.includes(task.taskListId)) {
      res.status(404).json({
        error: 'Task not found',
      });
      return;
    }

    // リクエストオブジェクトに情報を追加
    req.task = task;
    req.taskList = task.taskList;
    req.appData = app;

    next();
  } catch (error) {
    console.error('Task access check error:', error);
    res.status(500).json({
      error: 'Internal server error during access check',
    });
  }
};