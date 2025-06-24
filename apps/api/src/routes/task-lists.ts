import { type Response, Router } from 'express';
import { Prisma } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { getDatabase } from '../services/database';
import type { AuthenticatedRequest } from '../types/auth';
import {
  createTaskListSchema,
  updateTaskListSchema,
  validateData,
} from '../utils/validation';

const router = Router();

/**
 * GET /api/task-lists
 * タスクリスト一覧取得（ユーザーのApp.taskListOrderの順序で返却）
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId as string;
    const prisma = getDatabase();

    // ユーザーのApp設定を取得して順序を確認
    const app = await prisma.app.findUnique({
      where: { userId },
    });

    if (!app) {
      res.status(404).json({
        error: 'App not found for this user',
      });
      return;
    }

    // taskListOrderの順序でタスクリストを取得
    const taskLists = [];
    
    for (const taskListId of app.taskListOrder) {
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
      
      if (taskList) {
        taskLists.push(taskList);
      }
    }

    res.status(200).json({
      message: 'Task lists retrieved successfully',
      data: { taskLists },
    });
  } catch (error) {
    console.error('Task lists retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error during task lists retrieval',
    });
  }
});

/**
 * POST /api/task-lists
 * タスクリスト作成（ユーザーのApp.taskListOrderに自動追加）
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId as string;

    const validation = validateData(createTaskListSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { name } = validation.data as { name: string };

    const prisma = getDatabase();

    let taskList;
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // タスクリストを作成
      taskList = await tx.taskList.create({
        data: {
          name,
          background: '',
        },
        select: {
          id: true,
          name: true,
          background: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // ユーザーのApp設定のtaskListOrderに追加
      const app = await tx.app.findUnique({
        where: { userId },
      });

      if (app) {
        const updatedOrder = [...app.taskListOrder, taskList.id];
        await tx.app.update({
          where: { userId },
          data: { taskListOrder: updatedOrder },
        });
      }
    });

    res.status(201).json({
      message: 'Task list created successfully',
      data: { taskList },
    });
  } catch (error) {
    console.error('Task list creation error:', error);
    res.status(500).json({
      error: 'Internal server error during task list creation',
    });
  }
});

/**
 * PUT /api/task-lists/:taskListId
 * タスクリスト更新
 */
router.put('/:taskListId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskListId } = req.params;
    const userId = req.userId as string;

    if (!taskListId) {
      res.status(400).json({
        error: 'Task list ID is required',
      });
      return;
    }

    const validation = validateData(updateTaskListSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { name, background } = validation.data as {
      name?: string;
      background?: string;
    };

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

    // タスクリストを更新
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (background !== undefined) updateData.background = background;

    const taskList = await prisma.taskList.update({
      where: { id: taskListId },
      data: updateData,
      select: {
        id: true,
        name: true,
        background: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: 'Task list updated successfully',
      data: { taskList },
    });
  } catch (error) {
    console.error('Task list update error:', error);
    res.status(500).json({
      error: 'Internal server error during task list update',
    });
  }
});

/**
 * DELETE /api/task-lists/:taskListId
 * タスクリスト削除
 */
router.delete('/:taskListId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // タスクリストを削除（Cascadeでタスクも削除される）
      await tx.taskList.delete({
        where: { id: taskListId },
      });

      // App設定のtaskListOrderからも削除
      const updatedOrder = app.taskListOrder.filter((id: string) => id !== taskListId);
      await tx.app.update({
        where: { userId },
        data: { taskListOrder: updatedOrder },
      });
    });

    res.status(200).json({
      message: 'Task list deleted successfully',
    });
  } catch (error) {
    console.error('Task list deletion error:', error);
    res.status(500).json({
      error: 'Internal server error during task list deletion',
    });
  }
});

/**
 * POST /api/task-lists/:taskListId/share
 * タスクリスト共有リンク生成
 */
router.post('/:taskListId/share', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

    // 既存の共有設定をチェック
    const existingShare = await prisma.taskListShare.findUnique({
      where: { taskListId },
    });

    let shareToken: string;

    if (existingShare && existingShare.isActive) {
      // 既存のアクティブな共有がある場合はそれを使用
      shareToken = existingShare.shareToken;
    } else {
      // 新しい共有トークンを生成
      shareToken = generateShareToken();

      if (existingShare) {
        // 既存の非アクティブな共有を更新
        await prisma.taskListShare.update({
          where: { id: existingShare.id },
          data: {
            shareToken,
            isActive: true,
          },
        });
      } else {
        // 新しい共有を作成
        await prisma.taskListShare.create({
          data: {
            taskListId,
            shareToken,
            isActive: true,
          },
        });
      }
    }

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareToken}`;

    res.status(201).json({
      message: 'Share link created successfully',
      data: {
        shareUrl,
        shareToken,
      },
    });
  } catch (error) {
    console.error('Share link creation error:', error);
    res.status(500).json({
      error: 'Internal server error during share link creation',
    });
  }
});

/**
 * DELETE /api/task-lists/:taskListId/share
 * タスクリスト共有解除
 */
router.delete('/:taskListId/share', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

    // 共有設定を無効化
    const updateResult = await prisma.taskListShare.updateMany({
      where: {
        taskListId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    if (updateResult.count === 0) {
      res.status(404).json({
        error: 'Share link not found for this task list',
      });
      return;
    }

    res.status(200).json({
      message: 'Share link deleted successfully',
    });
  } catch (error) {
    console.error('Share link deletion error:', error);
    res.status(500).json({
      error: 'Internal server error during share link deletion',
    });
  }
});

/**
 * 共有トークンを生成する関数
 */
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default router;