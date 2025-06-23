import { type Request, type Response, Router } from 'express';
import { getDatabase } from '../services/database';

const router = Router();

/**
 * GET /api/share/:shareToken
 * 共有タスクリスト情報取得
 */
router.get('/:shareToken', async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    if (!shareToken) {
      res.status(400).json({
        error: 'Share token is required',
      });
      return;
    }

    const prisma = getDatabase();

    // 共有トークンから共有設定を取得
    const taskListShare = await prisma.taskListShare.findUnique({
      where: {
        shareToken,
      },
      include: {
        taskList: {
          include: {
            tasks: {
              select: {
                id: true,
                text: true,
                completed: true,
                date: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
    });

    if (!taskListShare || !taskListShare.isActive) {
      res.status(404).json({
        error: 'Shared task list not found',
      });
      return;
    }

    const { taskList } = taskListShare;

    res.status(200).json({
      message: 'Shared task list retrieved successfully',
      data: {
        taskList: {
          id: taskList.id,
          name: taskList.name,
          background: taskList.background,
          tasks: taskList.tasks,
        },
      },
    });
  } catch (error) {
    console.error('Shared task list retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error during shared task list retrieval',
    });
  }
});

export default router;