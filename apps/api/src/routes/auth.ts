import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDatabase } from '../services/database';
import type { AuthenticatedRequest, AuthTokens } from '../types/auth';
import {
  REFRESH_TOKEN_EXPIRY_MS,
  generateTokenPair,
  verifyRefreshToken,
} from '../utils/jwt';
import { 
  createPasswordResetToken, 
  validatePasswordResetToken, 
  markPasswordResetTokenAsUsed 
} from '../utils/password-reset';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  validateData,
} from '../utils/validation';

const router = Router();

// 最大デバイス数の制限
const MAX_DEVICES_PER_USER = 5;

/**
 * POST /api/auth/register
 * ユーザー登録
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const prisma = getDatabase();
    
    // 基本的なリクエストデータの検証
    const validation = validateData(registerSchema, req.body);
    if (!validation.success) {
      // パスワード強度エラーのみ特別なメッセージを使用（空パスワードなど他のエラーは除外）
      const isPasswordStrengthError = validation.errors?.length === 1 && 
        validation.errors[0] === 'Password does not meet requirements';
      
      res.status(400).json({
        error: isPasswordStrengthError ? 'Password does not meet requirements' : 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { email, password, deviceId } = validation.data as {
      email: string;
      password: string;
      deviceId: string;
    };


    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({
        error: 'User already exists with this email',
      });
      return;
    }

    // パスワードのハッシュ化
    const hashedPassword = await hashPassword(password);

    // JWTトークンペアの生成（ユーザーIDは後で設定）
    let tokens: AuthTokens | undefined;
    let user: any;

    // 全ての作成操作をトランザクションで実行
    await prisma.$transaction(async (tx) => {
      // ユーザー作成
      user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (process.env.NODE_ENV === 'test') {
        console.log(`[REGISTER DEBUG] User created: ${user.id}, email: ${user.email}`);
      }

      // JWTトークンペアの生成
      tokens = generateTokenPair(user.id, user.email, deviceId);

      if (process.env.NODE_ENV === 'test') {
        console.log(`[REGISTER DEBUG] Tokens generated for user: ${user.id}, deviceId: ${deviceId}`);
      }

      // リフレッシュトークンをデータベースに保存
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: tokens.refreshToken,
          deviceId,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
        },
      });

      if (process.env.NODE_ENV === 'test') {
        console.log(`[REGISTER DEBUG] Refresh token created for user: ${user.id}`);
      }

      // デフォルトのApp設定を作成
      await tx.app.create({
        data: {
          userId: user.id,
          taskListOrder: [],
          taskInsertPosition: 'top',
          autoSort: false,
        },
      });

      if (process.env.NODE_ENV === 'test') {
        console.log(`[REGISTER DEBUG] App created for user: ${user.id}`);
      }

      // デフォルトのSettings設定を作成
      await tx.settings.create({
        data: {
          userId: user.id,
          theme: 'system',
          language: 'ja',
        },
      });

      if (process.env.NODE_ENV === 'test') {
        console.log(`[REGISTER DEBUG] Settings created for user: ${user.id}`);
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      data: {
        user,
        token: tokens!.token,
        refreshToken: tokens!.refreshToken,
        expiresIn: tokens!.expiresIn,
        refreshExpiresIn: tokens!.refreshExpiresIn,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error during registration',
    });
  }
});

/**
 * POST /api/auth/login
 * ユーザーログイン
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const prisma = getDatabase();
    
    // リクエストデータの検証
    const validation = validateData(loginSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { email, password, deviceId } = validation.data as {
      email: string;
      password: string;
      deviceId: string;
    };

    let tokens: AuthTokens | undefined;
    let userData: any;

    // 全ての処理をトランザクションで実行（厳密な分離レベルとタイムアウトを設定）
    await prisma.$transaction(async (tx) => {
      // ユーザーの検索
      const user = await tx.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (process.env.NODE_ENV === 'test') {
        console.log(`[LOGIN DEBUG] User found: ${user.id}, email: ${user.email}`);
      }

      // パスワードの検証
      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // JWTトークンペアの生成
      tokens = generateTokenPair(user.id, user.email, deviceId);
      
      if (process.env.NODE_ENV === 'test') {
        console.log(`[LOGIN DEBUG] Tokens generated for user: ${user.id}, deviceId: ${deviceId}`);
      }
      
      // デバイス数の制限チェックと古いトークンの削除
      const activeTokens = await tx.refreshToken.findMany({
        where: {
          userId: user.id,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (process.env.NODE_ENV === 'test') {
        console.log(`[LOGIN DEBUG] Found ${activeTokens.length} active tokens for user: ${user.id}`);
      }

      // 既存のデバイスIDがあるかチェック
      const existingDeviceToken = activeTokens.find(token => token.deviceId === deviceId);

      if (existingDeviceToken) {
        if (process.env.NODE_ENV === 'test') {
          console.log(`[LOGIN DEBUG] Deactivating existing device token: ${existingDeviceToken.id}`);
        }
        // 既存のデバイストークンを無効化
        await tx.refreshToken.update({
          where: { id: existingDeviceToken.id },
          data: { isActive: false },
        });
      } else if (activeTokens.length >= MAX_DEVICES_PER_USER) {
        // 最大デバイス数を超える場合、最も古いトークンを無効化
        const oldestToken = activeTokens[0];
        if (oldestToken) {
          if (process.env.NODE_ENV === 'test') {
            console.log(`[LOGIN DEBUG] Deactivating oldest token due to device limit: ${oldestToken.id}`);
          }
          await tx.refreshToken.update({
            where: { id: oldestToken.id },
            data: { isActive: false },
          });
        }
      }

      // ユーザーが存在することを再確認（外部キー制約エラー防止）
      // トランザクション内で既にuserオブジェクトを取得しているので、追加の確認は不要
      // しかし、念のため短時間待機してからリフレッシュトークンを作成
      if (process.env.NODE_ENV === 'test') {
        console.log(`[LOGIN DEBUG] User confirmed exists: ${user.id}`);
      }

      if (process.env.NODE_ENV === 'test') {
        console.log(`[LOGIN DEBUG] Creating refresh token for user: ${user.id}, deviceId: ${deviceId}`);
      }

      // リフレッシュトークンをデータベースに保存
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: tokens.refreshToken,
          deviceId,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
        },
      });

      if (process.env.NODE_ENV === 'test') {
        console.log(`[LOGIN DEBUG] Refresh token created successfully for user: ${user.id}`);
      }

      // レスポンス用のユーザーデータを設定
      userData = {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    res.status(200).json({
      message: 'Login successful',
      data: {
        user: userData,
        token: tokens!.token,
        refreshToken: tokens!.refreshToken,
        expiresIn: tokens!.expiresIn,
        refreshExpiresIn: tokens!.refreshExpiresIn,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // バリデーションエラーの場合は400を返す
    if (error instanceof Error && error.message === 'Invalid email or password') {
      res.status(400).json({
        error: error.message,
      });
      return;
    }
    
    res.status(500).json({
      error: 'Internal server error during login',
    });
  }
});

/**
 * POST /api/auth/logout
 * ユーザーログアウト
 */
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getDatabase();
    const { refreshToken, deviceId } = req.body;

    if (refreshToken) {
      // 特定のリフレッシュトークンを無効化
      await prisma.refreshToken.updateMany({
        where: {
          userId: req.userId as string,
          token: refreshToken,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    } else if (deviceId) {
      // 特定のデバイスのトークンを無効化
      await prisma.refreshToken.updateMany({
        where: {
          userId: req.userId as string,
          deviceId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    }

    res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error during logout',
    });
  }
});

/**
 * POST /api/auth/refresh
 * トークンリフレッシュ
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const prisma = getDatabase();
    
    // リクエストデータの検証
    const validation = validateData(refreshTokenSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { refreshToken, deviceId } = validation.data as {
      refreshToken: string;
      deviceId: string;
    };

    // リフレッシュトークンの検証
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({
        error: 'Invalid or expired refresh token',
      });
      return;
    }

    // データベースからリフレッシュトークンを確認
    const dbToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: payload.userId,
        deviceId: payload.deviceId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!dbToken) {
      res.status(401).json({
        error: 'Invalid refresh token',
      });
      return;
    }

    // デバイスIDの一致を確認
    if (dbToken.deviceId !== deviceId) {
      res.status(401).json({
        error: 'Device ID mismatch',
      });
      return;
    }

    // 新しいアクセストークンを生成
    const tokens = generateTokenPair(dbToken.user.id, dbToken.user.email, deviceId);

    // 古いリフレッシュトークンを無効化し、新しいものを作成
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: dbToken.id },
        data: { isActive: false },
      }),
      prisma.refreshToken.create({
        data: {
          userId: dbToken.user.id,
          token: tokens.refreshToken,
          deviceId,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
        },
      }),
    ]);

    res.status(200).json({
      message: 'Token refreshed successfully',
      data: {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        refreshExpiresIn: tokens.refreshExpiresIn,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal server error during token refresh',
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * パスワードリセット要求
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const prisma = getDatabase();
    
    // リクエストデータの検証
    const validation = validateData(forgotPasswordSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { email } = validation.data as { email: string };

    // ユーザーの検索
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // セキュリティ上、ユーザーが存在しない場合でも成功レスポンスを返す
      res.status(200).json({
        message: 'Password reset email sent successfully',
      });
      return;
    }

    // パスワードリセットトークンの生成・保存
    const resetToken = await createPasswordResetToken(prisma, user.id);
    
    // メール送信（開発環境ではコンソール出力）
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log(`Password reset token for ${email}: ${resetToken}`);
      console.log(`Reset URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
    } else {
      // 本番環境では実際のメール送信サービスを使用
      // TODO: メール送信サービスの実装
      console.log(`Password reset email would be sent to: ${email}`);
    }

    res.status(200).json({
      message: 'Password reset email sent successfully',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Internal server error during password reset request',
    });
  }
});

/**
 * POST /api/auth/reset-password
 * パスワードリセット実行
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const prisma = getDatabase();
    
    // リクエストデータの検証
    const validation = validateData(resetPasswordSchema, req.body);
    if (!validation.success) {
      // パスワード強度エラーのみ特別なメッセージを使用（空パスワードなど他のエラーは除外）
      const isPasswordStrengthError = validation.errors?.length === 1 && 
        validation.errors[0] === 'Password does not meet requirements';
      
      res.status(400).json({
        error: isPasswordStrengthError ? 'Password does not meet requirements' : 'Validation failed',
        details: validation.errors,
      });
      return;
    }

    const { token, newPassword } = validation.data as {
      token: string;
      newPassword: string;
    };

    // パスワードリセットトークンの検証
    const tokenValidation = await validatePasswordResetToken(prisma, token);
    if (!tokenValidation.isValid || !tokenValidation.userId) {
      res.status(400).json({
        error: tokenValidation.error || 'Invalid or expired reset token',
      });
      return;
    }

    // トランザクションでパスワード更新と関連トークンの無効化を実行
    await prisma.$transaction(async (tx) => {
      // パスワードをハッシュ化
      const hashedPassword = await hashPassword(newPassword);

      // ユーザーのパスワードを更新
      await tx.user.update({
        where: { id: tokenValidation.userId! },
        data: { password: hashedPassword },
      });

      // 使用したリセットトークンを無効化
      await markPasswordResetTokenAsUsed(tx, token);

      // ユーザーの全てのリフレッシュトークンを無効化（セキュリティ対策）
      await tx.refreshToken.updateMany({
        where: {
          userId: tokenValidation.userId!,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    res.status(200).json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal server error during password reset',
    });
  }
});

export default router;
