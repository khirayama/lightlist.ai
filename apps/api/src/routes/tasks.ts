import { type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkTaskListAccess, checkTaskAccess } from '../middleware/taskListAuth';
import { getDatabase } from '../services/database';
import type { AuthenticatedRequest } from '../types/auth';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskOrderSchema,
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

      // 共同編集機能チェックとタスクリスト情報取得
      const [taskListDocument, taskList] = await Promise.all([
        prisma.taskListDocument.findUnique({
          where: { taskListId },
          select: { id: true },
        }),
        prisma.taskList.findUnique({
          where: { id: taskListId },
          select: { taskOrder: true },
        }),
      ]);

      // 条件に基づく最適化されたクエリ
      let tasks = await prisma.task.findMany({
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
              { createdAt: 'desc' },   // 作成日時降順（新しいものが先）
            ]
          : { createdAt: 'desc' }, // 通常時（新しいものが先）
      });

      // 手動並び順の適用（共同編集無効かつ自動ソート無効の場合）
      if (!taskListDocument && !app.autoSort && taskList?.taskOrder && taskList.taskOrder.length > 0) {
        const taskOrder = taskList.taskOrder;
        const tasksMap = new Map(tasks.map(task => [task.id, task]));
        const orderedTasks = [];
        
        // taskOrderに従って並び替え
        for (const taskId of taskOrder) {
          const task = tasksMap.get(taskId);
          if (task) {
            orderedTasks.push(task);
            tasksMap.delete(taskId);
          }
        }
        
        // taskOrderに含まれないタスクを末尾に追加（新しい順）
        const remainingTasks = Array.from(tasksMap.values());
        tasks = [...orderedTasks, ...remainingTasks];
      }

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
      const app = req.appData!; // ミドルウェアで保証済み

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

      // 共同編集が無効かつ自動ソートが無効の場合、taskOrderを更新
      const taskListDocument = await prisma.taskListDocument.findUnique({
        where: { taskListId },
        select: { id: true },
      });

      if (!taskListDocument && !app.autoSort) {
        const taskList = await prisma.taskList.findUnique({
          where: { id: taskListId },
          select: { taskOrder: true },
        });

        if (taskList) {
          const newTaskOrder = app.taskInsertPosition === 'top' 
            ? [task.id, ...(taskList.taskOrder || [])]
            : [...(taskList.taskOrder || []), task.id];

          await prisma.taskList.update({
            where: { id: taskListId },
            data: { taskOrder: newTaskOrder },
          });
        }
      }

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

      // 削除前にタスク情報を取得
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { taskListId: true },
      });

      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // タスクを削除
      await prisma.task.delete({
        where: { id: taskId },
      });

      // taskOrderから削除されたタスクIDを除去
      const taskList = await prisma.taskList.findUnique({
        where: { id: task.taskListId },
        select: { taskOrder: true },
      });

      if (taskList && taskList.taskOrder.includes(taskId)) {
        const newTaskOrder = taskList.taskOrder.filter(id => id !== taskId);
        await prisma.taskList.update({
          where: { id: task.taskListId },
          data: { taskOrder: newTaskOrder },
        });
      }

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

      // 削除対象のタスクIDを取得
      const completedTasks = await prisma.task.findMany({
        where: { 
          taskListId,
          completed: true 
        },
        select: { id: true },
      });

      const deletedTaskIds = completedTasks.map(task => task.id);

      // 完了済みタスクを一括削除
      const deleteResult = await prisma.task.deleteMany({
        where: { 
          taskListId,
          completed: true 
        },
      });

      // taskOrderから削除されたタスクIDを除去
      if (deletedTaskIds.length > 0) {
        const taskList = await prisma.taskList.findUnique({
          where: { id: taskListId },
          select: { taskOrder: true },
        });

        if (taskList && taskList.taskOrder.length > 0) {
          const newTaskOrder = taskList.taskOrder.filter(id => !deletedTaskIds.includes(id));
          await prisma.taskList.update({
            where: { id: taskListId },
            data: { taskOrder: newTaskOrder },
          });
        }
      }

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
 * PUT /api/task-lists/:taskListId/tasks/order
 * タスク順序更新
 */
router.put(
  '/:taskListId/tasks/order',
  authenticateToken,
  checkTaskListAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskListId } = req.params;

      if (!taskListId) {
        res.status(400).json({ error: 'Task list ID is required' });
        return;
      }

      const validation = validateData(updateTaskOrderSchema, req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.errors,
        });
        return;
      }

      const { taskIds } = validation.data as { taskIds: string[] };
      const app = req.appData!; // ミドルウェアで保証済み

      const prisma = getDatabase();

      // 共同編集機能チェック
      const taskListDocument = await prisma.taskListDocument.findUnique({
        where: { taskListId },
        select: { id: true },
      });

      // 共同編集が有効または自動ソートが有効な場合は手動並び替え不可
      if (taskListDocument || app.autoSort) {
        res.status(400).json({
          error: taskListDocument 
            ? 'Task order cannot be updated when collaborative editing is enabled'
            : 'Task order cannot be updated when auto-sort is enabled',
        });
        return;
      }

      // 指定されたタスクIDがすべて存在し、指定のタスクリストに属しているか確認
      const existingTasks = await prisma.task.findMany({
        where: {
          id: { in: taskIds },
          taskListId,
        },
        select: { id: true },
      });

      const existingTaskIds = existingTasks.map(task => task.id);
      const invalidTaskIds = taskIds.filter(id => !existingTaskIds.includes(id));

      if (invalidTaskIds.length > 0) {
        res.status(400).json({
          error: 'Invalid task IDs',
          details: [`The following task IDs are invalid: ${invalidTaskIds.join(', ')}`],
        });
        return;
      }

      // taskOrderを更新
      await prisma.taskList.update({
        where: { id: taskListId },
        data: { taskOrder: taskIds },
      });

      res.status(200).json({
        message: 'Task order updated successfully',
        data: { taskOrder: taskIds },
      });
    } catch (error) {
      console.error('Task order update error:', error);
      res.status(500).json({
        error: 'Internal server error during task order update',
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