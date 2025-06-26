import { type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkTaskListAccess, checkTaskAccess } from '../middleware/taskListAuth';
import { getDatabase } from '../services/database';
import type { AuthenticatedRequest } from '../types/auth';
import {
  createTaskSchema,
  updateTaskSchema,
  validateData,
} from '../utils/validation';
import { extractDateFromTaskText } from '../utils/dateExtraction';

const router = Router();

/**
 * GET /api/task-lists/:taskListId/tasks
 * タスク一覧取得（最適化版）
 */
router.get(
  '/:taskListId/tasks', 
  authenticateToken, 
  checkTaskListAccess, 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskListId } = req.params;
      
      if (!taskListId) {
        res.status(400).json({ error: 'Task list ID is required' });
        return;
      }
      
      const app = req.appData!; // ミドルウェアで保証済み
      
      const prisma = getDatabase();

      // 共同編集機能チェック
      const taskListDocument = await prisma.taskListDocument.findUnique({
        where: { taskListId },
        select: { id: true },
      });

      // 条件に基づく最適化されたクエリ
      const tasks = await prisma.task.findMany({
        where: { taskListId },
        select: {
          id: true,
          text: true,
          completed: true,
          date: true,
          taskListId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: taskListDocument
          ? { createdAt: 'asc' } // 共同編集有効時
          : app.autoSort
          ? [
              { completed: 'asc' },    // 未完了が先
              { date: 'asc' },         // 日付昇順（nullは最後）
              { createdAt: 'asc' },    // 作成日時昇順
            ]
          : { createdAt: 'asc' }, // 通常時
      });

      res.status(200).json({
        message: 'Tasks retrieved successfully',
        data: { 
          tasks,
          totalCount: tasks.length,
          completedCount: tasks.filter(task => task.completed).length,
        },
      });
    } catch (error) {
      console.error('Tasks retrieval error:', error);
      res.status(500).json({
        error: 'Internal server error during tasks retrieval',
      });
    }
  }
);

/**
 * POST /api/task-lists/:taskListId/tasks
 * タスク作成（最適化版）
 */
router.post(
  '/:taskListId/tasks', 
  authenticateToken, 
  checkTaskListAccess, 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskListId } = req.params;
      
      if (!taskListId) {
        res.status(400).json({ error: 'Task list ID is required' });
        return;
      }
      
      const validation = validateData(createTaskSchema, req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.errors,
        });
        return;
      }

      const { text, date } = validation.data as { text: string; date?: string | null };

      const prisma = getDatabase();

      // タスクテキストから日付を抽出（提供された日付が優先）
      const { cleanText, extractedDate } = extractDateFromTaskText(text);
      const finalDate = date !== undefined ? date : extractedDate;

      // タスクを作成
      const task = await prisma.task.create({
        data: {
          text: cleanText,
          completed: false,
          date: finalDate,
          taskListId,
        },
        select: {
          id: true,
          text: true,
          completed: true,
          date: true,
          taskListId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(201).json({
        message: 'Task created successfully',
        data: { task },
      });
    } catch (error) {
      console.error('Task creation error:', error);
      res.status(500).json({
        error: 'Internal server error during task creation',
      });
    }
  }
);

/**
 * PUT /api/tasks/:taskId
 * タスク更新（最適化版）
 */
router.put(
  '/:taskId', 
  authenticateToken, 
  checkTaskAccess, 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskId } = req.params;
      
      if (!taskId) {
        res.status(400).json({ error: 'Task ID is required' });
        return;
      }
      
      const validation = validateData(updateTaskSchema, req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.errors,
        });
        return;
      }

      const { text, completed, date } = validation.data as {
        text?: string;
        completed?: boolean;
        date?: string | null;
      };

      const prisma = getDatabase();

      // 更新データを準備
      let updateData: any = {};
      
      if (completed !== undefined) {
        updateData.completed = completed;
      }
      
      if (date !== undefined) {
        updateData.date = date;
      }
      
      if (text !== undefined) {
        const { cleanText, extractedDate } = extractDateFromTaskText(text);
        updateData.text = cleanText;
        // テキストから日付が抽出された場合は優先
        if (extractedDate !== null && date === undefined) {
          updateData.date = extractedDate;
        }
      }

      // タスクを更新
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        select: {
          id: true,
          text: true,
          completed: true,
          date: true,
          taskListId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        message: 'Task updated successfully',
        data: { task: updatedTask },
      });
    } catch (error) {
      console.error('Task update error:', error);
      res.status(500).json({
        error: 'Internal server error during task update',
      });
    }
  }
);

/**
 * DELETE /api/tasks/:taskId
 * タスク削除（最適化版）
 */
router.delete(
  '/:taskId', 
  authenticateToken, 
  checkTaskAccess, 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskId } = req.params;
      
      if (!taskId) {
        res.status(400).json({ error: 'Task ID is required' });
        return;
      }
      
      const prisma = getDatabase();

      // タスクを削除
      await prisma.task.delete({
        where: { id: taskId },
      });

      res.status(200).json({
        message: 'Task deleted successfully',
      });
    } catch (error) {
      console.error('Task deletion error:', error);
      res.status(500).json({
        error: 'Internal server error during task deletion',
      });
    }
  }
);

/**
 * DELETE /api/task-lists/:taskListId/tasks/completed
 * 完了済みタスク一括削除（最適化版）
 */
router.delete(
  '/:taskListId/tasks/completed', 
  authenticateToken, 
  checkTaskListAccess, 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskListId } = req.params;
      
      if (!taskListId) {
        res.status(400).json({ error: 'Task list ID is required' });
        return;
      }
      
      const prisma = getDatabase();

      // 完了済みタスクを一括削除
      const deleteResult = await prisma.task.deleteMany({
        where: { 
          taskListId,
          completed: true 
        },
      });

      res.status(200).json({
        message: 'Completed tasks deleted successfully',
        data: { deletedCount: deleteResult.count },
      });
    } catch (error) {
      console.error('Completed tasks deletion error:', error);
      res.status(500).json({
        error: 'Internal server error during completed tasks deletion',
      });
    }
  }
);

/**
 * GET /api/task-lists/:taskListId/tasks/stats
 * タスク統計情報取得（最適化版）
 */
router.get(
  '/:taskListId/tasks/stats', 
  authenticateToken, 
  checkTaskListAccess, 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskListId } = req.params;
      
      if (!taskListId) {
        res.status(400).json({ error: 'Task list ID is required' });
        return;
      }
      
      const prisma = getDatabase();

      // 統計情報を効率的に取得
      const today = new Date().toISOString().split('T')[0] || '';
      const [totalCount, completedCount, dueTodayCount, overdueCount] = await Promise.all([
        prisma.task.count({
          where: { taskListId }
        }),
        prisma.task.count({
          where: { taskListId, completed: true }
        }),
        prisma.task.count({
          where: { 
            taskListId, 
            completed: false,
            date: today
          }
        }),
        prisma.task.count({
          where: { 
            taskListId, 
            completed: false,
            date: {
              lt: today
            }
          }
        }),
      ]);

      res.status(200).json({
        message: 'Task stats retrieved successfully',
        data: {
          totalCount,
          completedCount,
          pendingCount: totalCount - completedCount,
          dueTodayCount,
          overdueCount,
          completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        },
      });
    } catch (error) {
      console.error('Task stats retrieval error:', error);
      res.status(500).json({
        error: 'Internal server error during task stats retrieval',
      });
    }
  }
);

export default router;