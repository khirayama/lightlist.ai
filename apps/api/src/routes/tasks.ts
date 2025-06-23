import { type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDatabase } from '../services/database';
import type { AuthenticatedRequest } from '../types/auth';
import {
  createTaskSchema,
  updateTaskSchema,
  validateData,
} from '../utils/validation';

const router = Router();

/**
 * GET /api/task-lists/:taskListId/tasks
 * タスク一覧取得（共同編集機能が有効な場合はYjsドキュメントの順序、無効な場合は作成日時順）
 */
router.get('/:taskListId/tasks', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

    // ユーザーがこのタスクリストにアクセス権限があるかチェック
    const app = await prisma.app.findUnique({
      where: { userId },
    });

    if (!app || !app.taskListOrder.includes(taskListId)) {
      res.status(404).json({
        error: 'Task list not found',
      });
      return;
    }

    // 共同編集機能が有効かチェック
    const taskListDocument = await prisma.taskListDocument.findUnique({
      where: { taskListId },
    });

    let tasks;
    if (taskListDocument) {
      // 共同編集機能が有効な場合は、Yjsドキュメントの順序で取得
      // 現在のシンプルな実装では作成日時順で取得
      tasks = await prisma.task.findMany({
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
        orderBy: { createdAt: 'asc' },
      });
    } else {
      // 通常の場合は、アプリ設定に応じた並び順で取得
      if (app.autoSort) {
        // 自動ソートが有効な場合は、完了状態・日付・作成日時順
        tasks = await prisma.task.findMany({
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
          orderBy: [
            { completed: 'asc' },      // 未完了が先
            { date: 'asc' },           // 日付昇順（nullは最後）
            { createdAt: 'asc' },      // 作成日時昇順
          ],
        });
      } else {
        // 通常は作成日時順
        tasks = await prisma.task.findMany({
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
          orderBy: { createdAt: 'asc' },
        });
      }
    }

    res.status(200).json({
      message: 'Tasks retrieved successfully',
      data: { tasks },
    });
  } catch (error) {
    console.error('Tasks retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error during tasks retrieval',
    });
  }
});

/**
 * POST /api/task-lists/:taskListId/tasks
 * タスク作成
 */
router.post('/:taskListId/tasks', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskListId } = req.params;
    const userId = req.userId as string;

    if (!taskListId) {
      res.status(400).json({
        error: 'Task list ID is required',
      });
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

    const { text } = validation.data as { text: string };

    const prisma = getDatabase();

    // ユーザーがこのタスクリストにアクセス権限があるかチェック
    const app = await prisma.app.findUnique({
      where: { userId },
    });

    if (!app || !app.taskListOrder.includes(taskListId)) {
      res.status(404).json({
        error: 'Task list not found',
      });
      return;
    }

    // タスクテキストから日付を抽出
    const { cleanText, extractedDate } = extractDateFromTaskText(text);

    // タスクを作成
    const task = await prisma.task.create({
      data: {
        text: cleanText,
        completed: false,
        date: extractedDate,
        taskListId,
      },
      select: {
        id: true,
        text: true,
        completed: true,
        date: true,
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
});

/**
 * PUT /api/tasks/:taskId
 * タスク更新
 */
router.put('/:taskId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId as string;

    if (!taskId) {
      res.status(400).json({
        error: 'Task ID is required',
      });
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

    // タスクが存在し、ユーザーがアクセス権限があるかチェック
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { taskList: true },
    });

    if (!task) {
      res.status(404).json({
        error: 'Task not found',
      });
      return;
    }

    // ユーザーがこのタスクのタスクリストにアクセス権限があるかチェック
    const app = await prisma.app.findUnique({
      where: { userId },
    });

    if (!app || !app.taskListOrder.includes(task.taskListId)) {
      res.status(404).json({
        error: 'Task not found',
      });
      return;
    }

    // タスクテキストが更新される場合、日付を抽出
    let updateData: any = { completed, date };
    if (text !== undefined) {
      const { cleanText, extractedDate } = extractDateFromTaskText(text);
      updateData.text = cleanText;
      // テキストから日付が抽出された場合は優先、そうでなければリクエストのdateを使用
      if (extractedDate !== null) {
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
});

/**
 * DELETE /api/tasks/:taskId
 * タスク削除
 */
router.delete('/:taskId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

    // タスクが存在し、ユーザーがアクセス権限があるかチェック
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { taskList: true },
    });

    if (!task) {
      res.status(404).json({
        error: 'Task not found',
      });
      return;
    }

    // ユーザーがこのタスクのタスクリストにアクセス権限があるかチェック
    const app = await prisma.app.findUnique({
      where: { userId },
    });

    if (!app || !app.taskListOrder.includes(task.taskListId)) {
      res.status(404).json({
        error: 'Task not found',
      });
      return;
    }

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
});

/**
 * タスクテキストから日付を抽出する関数
 */
function extractDateFromTaskText(text: string): { cleanText: string; extractedDate: string | null } {
  const today = new Date();
  let extractedDate: Date | null = null;
  let cleanText = text.trim();
  
  // 日本語の日付パターン
  const japanesePatterns = [
    { pattern: /^今日\s+/, date: new Date(today) },
    { pattern: /^明日\s+/, date: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
  ];
  
  // 英語の日付パターン
  const englishPatterns = [
    { pattern: /^today\s+/i, date: new Date(today) },
    { pattern: /^tomorrow\s+/i, date: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
  ];
  
  // 日付形式のパターン（YYYY/MM/DD, YYYY-MM-DD）
  const datePatterns = [
    /^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+/,
  ];
  
  // 日本語パターンをチェック
  for (const { pattern, date } of japanesePatterns) {
    if (pattern.test(cleanText)) {
      extractedDate = date;
      cleanText = cleanText.replace(pattern, '');
      break;
    }
  }
  
  // 英語パターンをチェック
  if (!extractedDate) {
    for (const { pattern, date } of englishPatterns) {
      if (pattern.test(cleanText)) {
        extractedDate = date;
        cleanText = cleanText.replace(pattern, '');
        break;
      }
    }
  }
  
  // 日付形式をチェック
  if (!extractedDate) {
    for (const pattern of datePatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        const parsedDate = new Date(match[1]);
        if (!isNaN(parsedDate.getTime())) {
          extractedDate = parsedDate;
          cleanText = cleanText.replace(pattern, '');
          break;
        }
      }
    }
  }
  
  return {
    cleanText: cleanText.trim(),
    extractedDate: extractedDate ? extractedDate.toISOString().split('T')[0] || null : null, // YYYY-MM-DD形式
  };
}

export default router;