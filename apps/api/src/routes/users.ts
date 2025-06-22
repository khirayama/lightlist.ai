import { type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDatabase } from '../services/database';
import type { AuthenticatedRequest } from '../types/auth';
import { hashPassword, verifyPassword } from '../utils/password';
import { optimizedTestHashPassword, optimizedTestVerifyPassword } from '../utils/password-test';
import {
  changePasswordSchema,
  updateProfileSchema,
  updateAppSettingsSchema,
  updateUserSettingsSchema,
  updateTaskListOrderSchema,
  validateData,
} from '../utils/validation';

// テスト環境でのパスワード関数の選択
const isTestEnvironment = process.env.NODE_ENV === 'test';
const passwordHash = isTestEnvironment ? optimizedTestHashPassword : hashPassword;
const passwordVerify = isTestEnvironment ? optimizedTestVerifyPassword : verifyPassword;

const router = Router();

/**
 * GET /api/users/:userId/profile
 * ユーザープロフィール取得
 */
router.get('/:userId/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    if (!userId) {
      res.status(400).json({
        error: 'User ID is required',
      });
      return;
    }

    // 自分のプロフィールのみ取得可能
    if (userId !== currentUserId) {
      res.status(403).json({
        error: 'Access denied',
      });
      return;
    }

    const prisma = getDatabase();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    res.status(200).json({
      message: 'User profile retrieved successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error during profile retrieval',
    });
  }
});

/**
 * PUT /api/users/:userId/profile
 * ユーザープロフィール更新
 */
router.put('/:userId/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    if (!userId) {
      res.status(400).json({
        error: 'User ID is required',
      });
      return;
    }

    // 自分のプロフィールのみ更新可能
    if (userId !== currentUserId) {
      res.status(403).json({
        error: 'Access denied',
      });
      return;
    }

    const validation = validateData(updateProfileSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { email } = validation.data as { email?: string };

    const prisma = getDatabase();

    // メールアドレスの重複チェック（更新する場合）
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        res.status(400).json({
          error: 'Email already exists',
        });
        return;
      }
    }

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Internal server error during profile update',
    });
  }
});

/**
 * DELETE /api/users/:userId
 * アカウント削除
 */
router.delete('/:userId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    if (!userId) {
      res.status(400).json({
        error: 'User ID is required',
      });
      return;
    }

    // 自分のアカウントのみ削除可能
    if (userId !== currentUserId) {
      res.status(403).json({
        error: 'Access denied',
      });
      return;
    }

    const prisma = getDatabase();

    // ユーザー削除（Cascadeによって関連データも削除される）
    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(200).json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      error: 'Internal server error during account deletion',
    });
  }
});

/**
 * PUT /api/users/:userId/change-password
 * パスワード変更
 */
router.put('/:userId/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    if (!userId) {
      res.status(400).json({
        error: 'User ID is required',
      });
      return;
    }

    // 自分のパスワードのみ変更可能
    if (userId !== currentUserId) {
      res.status(403).json({
        error: 'Access denied',
      });
      return;
    }

    const validation = validateData(changePasswordSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { currentPassword, newPassword } = validation.data as {
      currentPassword: string;
      newPassword: string;
    };

    const prisma = getDatabase();

    // 現在のユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    // 現在のパスワードを確認
    const isCurrentPasswordValid = await passwordVerify(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        error: 'Current password is incorrect',
      });
      return;
    }

    // 新しいパスワードをハッシュ化
    const hashedNewPassword = await passwordHash(newPassword);

    // パスワード更新
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Internal server error during password change',
    });
  }
});

/**
 * GET /api/users/:userId/app
 * ユーザーのApp情報取得
 */
router.get('/:userId/app', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    if (!userId) {
      res.status(400).json({
        error: 'User ID is required',
      });
      return;
    }

    // 自分のApp情報のみ取得可能
    if (userId !== currentUserId) {
      res.status(403).json({
        error: 'Access denied',
      });
      return;
    }

    const prisma = getDatabase();
    const app = await prisma.app.findUnique({
      where: { userId },
    });

    if (!app) {
      res.status(404).json({
        error: 'App not found for this user',
      });
      return;
    }

    res.status(200).json({
      message: 'App data retrieved successfully',
      data: { app },
    });
  } catch (error) {
    console.error('App retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error during app retrieval',
    });
  }
});

/**
 * PUT /api/users/:userId/app
 * ユーザーのApp設定更新
 */
router.put('/:userId/app', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    if (!userId) {
      res.status(400).json({
        error: 'User ID is required',
      });
      return;
    }

    // 自分のApp設定のみ更新可能
    if (userId !== currentUserId) {
      res.status(403).json({
        error: 'Access denied',
      });
      return;
    }

    const validation = validateData(updateAppSettingsSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { taskInsertPosition, autoSort } = validation.data as {
      taskInsertPosition?: 'top' | 'bottom';
      autoSort?: boolean;
    };

    const prisma = getDatabase();

    // App設定を更新（存在しない場合は404）
    const app = await prisma.app.findUnique({
      where: { userId },
    });

    if (!app) {
      res.status(404).json({
        error: 'App not found for this user',
      });
      return;
    }

    const updateData: any = {};
    if (taskInsertPosition !== undefined) updateData.taskInsertPosition = taskInsertPosition;
    if (autoSort !== undefined) updateData.autoSort = autoSort;

    const updatedApp = await prisma.app.update({
      where: { userId },
      data: updateData,
    });

    res.status(200).json({
      message: 'App settings updated successfully',
      data: { app: updatedApp },
    });
  } catch (error) {
    console.error('App update error:', error);
    res.status(500).json({
      error: 'Internal server error during app update',
    });
  }
});

/**
 * GET /api/users/:userId/settings
 * ユーザー設定取得
 */
router.get('/:userId/settings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    if (!userId) {
      res.status(400).json({
        error: 'User ID is required',
      });
      return;
    }

    // 自分の設定のみ取得可能
    if (userId !== currentUserId) {
      res.status(403).json({
        error: 'Access denied',
      });
      return;
    }

    const prisma = getDatabase();
    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: {
        theme: true,
        language: true,
      },
    });

    if (!settings) {
      res.status(404).json({
        error: 'Settings not found for this user',
      });
      return;
    }

    res.status(200).json({
      message: 'Settings retrieved successfully',
      data: { settings },
    });
  } catch (error) {
    console.error('Settings retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error during settings retrieval',
    });
  }
});

/**
 * PUT /api/users/:userId/settings
 * ユーザー設定更新
 */
router.put('/:userId/settings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    if (!userId) {
      res.status(400).json({
        error: 'User ID is required',
      });
      return;
    }

    // 自分の設定のみ更新可能
    if (userId !== currentUserId) {
      res.status(403).json({
        error: 'Access denied',
      });
      return;
    }

    const validation = validateData(updateUserSettingsSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { theme, language } = validation.data as {
      theme?: 'system' | 'light' | 'dark';
      language?: 'ja' | 'en';
    };

    const prisma = getDatabase();

    // 設定を更新
    const updateData: any = {};
    if (theme !== undefined) updateData.theme = theme;
    if (language !== undefined) updateData.language = language;

    const settings = await prisma.settings.update({
      where: { userId },
      data: updateData,
      select: {
        theme: true,
        language: true,
      },
    });

    res.status(200).json({
      message: 'Settings updated successfully',
      data: { settings },
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({
      error: 'Internal server error during settings update',
    });
  }
});

/**
 * PUT /api/users/:userId/task-lists/order
 * タスクリストの順序更新
 */
router.put('/:userId/task-lists/order', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    if (!userId) {
      res.status(400).json({
        error: 'User ID is required',
      });
      return;
    }

    // 自分のタスクリスト順序のみ更新可能
    if (userId !== currentUserId) {
      res.status(403).json({
        error: 'Access denied',
      });
      return;
    }

    const validation = validateData(updateTaskListOrderSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { taskListIds } = validation.data as { taskListIds: string[] };

    const prisma = getDatabase();

    // App設定を更新
    const app = await prisma.app.update({
      where: { userId },
      data: {
        taskListOrder: taskListIds,
      },
    });

    res.status(200).json({
      message: 'Task list order updated successfully',
      data: {
        taskListOrder: app.taskListOrder,
      },
    });
  } catch (error) {
    console.error('Task list order update error:', error);
    res.status(500).json({
      error: 'Internal server error during task list order update',
    });
  }
});

export default router;