import { type Response, Router } from 'express';
import * as Y from 'yjs';
import { authenticateToken } from '../middleware/auth';
import { getDatabase } from '../services/database';
import type { AuthenticatedRequest } from '../types/auth';
import { collaborativeSyncSchema, validateData } from '../utils/validation';
import {
  createInitialTaskListDoc,
  encodeYjsState,
  encodeYjsStateVector,
  decodeYjsState,
  generateYjsUpdate,
  applyYjsUpdate,
} from '../utils/yjs';

const router = Router();

/**
 * POST /api/task-lists/:taskListId/collaborative/initialize
 * 共同編集機能の初期化
 */
router.post('/:taskListId/initialize', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
      res.status(403).json({
        error: 'Access denied to this task list',
      });
      return;
    }

    // 既に共同編集が有効かチェック
    const existingDocument = await prisma.taskListDocument.findUnique({
      where: { taskListId },
    });

    if (existingDocument) {
      res.status(400).json({
        error: 'Collaborative editing is already enabled for this task list',
      });
      return;
    }

    // 現在のタスクを取得してYjsドキュメントを初期化
    const tasks = await prisma.task.findMany({
      where: { taskListId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    // 初期Yjsドキュメントを作成
    const doc = createInitialTaskListDoc();
    const tasksArray = doc.getArray('tasks');

    // 既存のタスクIDを順序通りに追加
    doc.transact(() => {
      for (const task of tasks) {
        const taskMap = new Y.Map();
        taskMap.set('id', task.id);
        taskMap.set('createdAt', Date.now());
        tasksArray.push([taskMap]);
      }
    });

    // Yjsドキュメントをエンコード
    const encodedState = encodeYjsState(doc);
    const encodedStateVector = encodeYjsStateVector(doc);

    // データベースに保存
    await prisma.taskListDocument.create({
      data: {
        taskListId,
        stateVector: Buffer.from(encodedStateVector, 'base64'),
        documentState: Buffer.from(encodedState, 'base64'),
      },
    });

    res.status(200).json({
      message: 'Collaborative editing initialized successfully',
      data: {
        state: encodedState,
        stateVector: encodedStateVector,
      },
    });
  } catch (error) {
    console.error('Collaborative initialization error:', error);
    res.status(500).json({
      error: 'Internal server error during collaborative initialization',
    });
  }
});

/**
 * GET /api/task-lists/:taskListId/collaborative/full-state
 * タスクリストの完全な共同編集状態を取得
 */
router.get('/:taskListId/full-state', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
      res.status(403).json({
        error: 'Access denied to this task list',
      });
      return;
    }

    // 共同編集ドキュメントを取得
    const document = await prisma.taskListDocument.findUnique({
      where: { taskListId },
    });

    if (!document) {
      res.status(404).json({
        error: 'Collaborative editing is not enabled for this task list',
      });
      return;
    }

    // バイナリデータをBase64に変換
    const encodedState = document.documentState.toString('base64');
    const encodedStateVector = document.stateVector.toString('base64');

    res.status(200).json({
      message: 'Collaborative state retrieved successfully',
      data: {
        state: encodedState,
        stateVector: encodedStateVector,
      },
    });
  } catch (error) {
    console.error('Collaborative state retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error during collaborative state retrieval',
    });
  }
});

/**
 * POST /api/task-lists/:taskListId/collaborative/sync
 * 共同編集の差分同期
 */
router.post('/:taskListId/sync', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskListId } = req.params;
    const userId = req.userId as string;

    if (!taskListId) {
      res.status(400).json({
        error: 'Task list ID is required',
      });
      return;
    }

    const validation = validateData(collaborativeSyncSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { stateVector, update } = validation.data as {
      stateVector: string;
      update?: string;
    };

    const prisma = getDatabase();

    // ユーザーがこのタスクリストにアクセス権限があるかチェック
    const app = await prisma.app.findUnique({
      where: { userId },
    });

    if (!app || !app.taskListOrder.includes(taskListId)) {
      res.status(403).json({
        error: 'Access denied to this task list',
      });
      return;
    }

    // トランザクションで同期処理を実行
    const result = await prisma.$transaction(async (tx) => {
      // 共同編集ドキュメントを取得
      const document = await tx.taskListDocument.findUnique({
        where: { taskListId },
      });

      if (!document) {
        throw new Error('Collaborative editing is not enabled for this task list');
      }

      // 現在のYjsドキュメントを復元
      const currentEncodedState = document.documentState.toString('base64');
      const doc = decodeYjsState(currentEncodedState);

      // クライアントからの更新を適用
      if (update) {
        try {
          applyYjsUpdate(doc, update);
        } catch (error) {
          console.error('Failed to apply update:', error);
          throw new Error('Invalid update data');
        }
      }

      // クライアントの状態ベクターに基づいて差分を生成
      const diffUpdate = generateYjsUpdate(doc, stateVector);

      // 更新されたドキュメントを保存
      const newEncodedState = encodeYjsState(doc);
      const newEncodedStateVector = encodeYjsStateVector(doc);

      await tx.taskListDocument.update({
        where: { taskListId },
        data: {
          stateVector: Buffer.from(newEncodedStateVector, 'base64'),
          documentState: Buffer.from(newEncodedState, 'base64'),
        },
      });

      return {
        update: diffUpdate,
        stateVector: newEncodedStateVector,
      };
    });

    res.status(200).json({
      message: 'Sync successful',
      data: result,
    });
  } catch (error) {
    console.error('Collaborative sync error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Collaborative editing is not enabled for this task list') {
        res.status(404).json({
          error: error.message,
        });
        return;
      }
      if (error.message === 'Invalid update data') {
        res.status(400).json({
          error: error.message,
        });
        return;
      }
    }
    
    res.status(500).json({
      error: 'Internal server error during collaborative sync',
    });
  }
});

export default router;