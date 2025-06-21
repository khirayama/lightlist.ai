import { PrismaClient } from '@prisma/client';
import { generateResetToken, getPasswordResetTokenExpiry } from './jwt';

// トランザクション用の型定義
type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * パスワードリセットトークンを作成
 */
export async function createPasswordResetToken(
  prisma: PrismaClient,
  userId: string
): Promise<string> {
  const token = generateResetToken();
  const expiresAt = getPasswordResetTokenExpiry();

  // トランザクションで既存トークン無効化と新トークン作成を実行
  await prisma.$transaction(async (tx) => {
    // 既存の未使用トークンを無効化（期限切れも含む）
    await tx.passwordResetToken.updateMany({
      where: {
        userId,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    // 新しいトークンを作成
    await tx.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  });

  return token;
}

/**
 * パスワードリセットトークンを検証
 */
export async function validatePasswordResetToken(
  prisma: PrismaClient,
  token: string
): Promise<{ isValid: boolean; userId?: string; error?: string }> {
  try {
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!resetToken) {
      return {
        isValid: false,
        error: 'Invalid or expired reset token',
      };
    }

    return {
      isValid: true,
      userId: resetToken.userId,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Token validation failed',
    };
  }
}

/**
 * パスワードリセットトークンを使用済みにマーク
 */
export async function markPasswordResetTokenAsUsed(
  prisma: PrismaClient | TransactionClient,
  token: string
): Promise<boolean> {
  try {
    const result = await prisma.passwordResetToken.updateMany({
      where: {
        token,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    return result.count > 0;
  } catch (error) {
    return false;
  }
}

/**
 * 期限切れトークンをクリーンアップ
 */
export async function cleanupExpiredPasswordResetTokens(
  prisma: PrismaClient
): Promise<number> {
  try {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  } catch (error) {
    return 0;
  }
}

/**
 * ユーザーのアクティブなパスワードリセットトークン数を取得
 */
export async function getUserActiveResetTokenCount(
  prisma: PrismaClient,
  userId: string
): Promise<number> {
  try {
    return await prisma.passwordResetToken.count({
      where: {
        userId,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  } catch (error) {
    return 0;
  }
}