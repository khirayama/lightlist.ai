import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '@/config';
import prisma from '@/config/database';
import { JwtPayload } from '@/shared/types';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserWithTokens {
  user: {
    id: string;
    email: string;
  };
  tokens: AuthTokens;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;

  static async register(
    email: string,
    password: string,
    deviceId: string
  ): Promise<UserWithTokens> {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    const user = await prisma.$transaction(async (tx: any) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
        },
      });

      // Create default App and Settings
      await tx.app.create({
        data: {
          userId: createdUser.id,
        },
      });

      await tx.settings.create({
        data: {
          userId: createdUser.id,
        },
      });

      return createdUser;
    });

    const tokens = await this.generateTokens(user.id, user.email, deviceId);

    return {
      user,
      tokens,
    };
  }

  static async login(
    email: string,
    password: string,
    deviceId: string
  ): Promise<UserWithTokens> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const tokens = await this.generateTokens(user.id, user.email, deviceId);

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      tokens,
    };
  }

  static async refresh(refreshToken: string): Promise<AuthTokens> {
    console.log('Auth.refresh - Starting token refresh');
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
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
          },
        },
      },
    });

    if (!tokenRecord) {
      console.log('Auth.refresh - Invalid refresh token');
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    console.log('Auth.refresh - Generating new tokens for user:', tokenRecord.user.id);
    const tokens = await this.generateTokens(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.deviceId
    );

    console.log('Auth.refresh - New tokens generated:', {
      accessToken: tokens.accessToken.substring(0, 50) + '...',
      refreshToken: tokens.refreshToken.substring(0, 50) + '...'
    });

    return tokens;
  }

  static async logout(refreshToken: string): Promise<void> {
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        isActive: true,
      },
    });

    if (!tokenRecord) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    await prisma.refreshToken.updateMany({
      where: {
        token: refreshToken,
      },
      data: {
        isActive: false,
      },
    });
  }

  static async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // セキュリティ上、メールアドレスの存在を秘匿する（成功を返す）
      return;
    }

    // 既存のリセットトークンを無効化
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    // 新しいリセットトークンを生成
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password-reset' },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    // TODO: メール送信処理（実装では省略）
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    let userId: string;
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      userId = decoded.userId;
    } catch (error) {
      throw new Error('INVALID_RESET_TOKEN');
    }

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        userId,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!tokenRecord) {
      throw new Error('INVALID_RESET_TOKEN');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await prisma.$transaction(async (tx: any) => {
      // パスワードを更新
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // リセットトークンを使用済みにする
      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { isUsed: true },
      });

      // 全てのリフレッシュトークンを無効化（セキュリティ上、再ログインを強制）
      await tx.refreshToken.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    });
  }

  private static generateUniqueJti(): string {
    // 高精度時間（ナノ秒）とプロセスIDを組み合わせて確実にユニークなIDを生成
    const highResTime = process.hrtime.bigint().toString();
    const processId = process.pid.toString();
    const cryptoRandom = crypto.randomUUID().replace(/-/g, '');
    const mathRandom = Math.random().toString(36).substring(2, 15);
    
    // より長いランダム文字列を生成して衝突確率を最小化
    const jti = `${highResTime}.${processId}.${cryptoRandom}.${mathRandom}`;
    
    // デバッグログ（本番環境では無効化）
    if (process.env.NODE_ENV === 'test') {
      console.log('Generated JTI:', {
        jti: jti.substring(0, 50) + '...',
        length: jti.length,
        timestamp: new Date().toISOString()
      });
    }
    
    return jti;
  }

  private static async generateTokens(
    userId: string,
    email: string,
    deviceId: string
  ): Promise<AuthTokens> {
    const now = Date.now();
    console.log('Auth.generateTokens - Creating tokens for user:', userId, 'at:', new Date().toISOString(), 'ms:', now);
    
    // ミリ秒を含むタイムスタンプを明示的に指定してユニークなトークンを保証
    const accessTokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId,
      email,
    };

    // 手動でiatとexpを設定してユニーク性を保証
    const accessToken = jwt.sign({
      ...accessTokenPayload,
      iat: Math.floor(now / 1000),
      exp: Math.floor(now / 1000) + 3600, // 1時間後
      jti: this.generateUniqueJti() // ユニークなJTIを生成
    }, config.jwt.secret);

    const refreshJti = this.generateUniqueJti();
    console.log('Auth.generateTokens - Generated refresh jti:', refreshJti);
    
    const refreshTokenValue = jwt.sign(
      { 
        userId, 
        deviceId, 
        jti: refreshJti,
        iat: Math.floor(now / 1000),
        exp: Math.floor(now / 1000) + (30 * 24 * 60 * 60) // 30日後
      },
      config.jwt.secret,
      {
        noTimestamp: true,
      }
    );

    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 30);

    await prisma.refreshToken.updateMany({
      where: {
        userId,
        deviceId,
      },
      data: {
        isActive: false,
      },
    });

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenValue,
        deviceId,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    console.log('Auth.generateTokens - Tokens created:', {
      accessTokenPart: accessToken.substring(0, 50) + '...',
      refreshTokenPart: refreshTokenValue.substring(0, 50) + '...',
      expiresIn: 3600
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 3600, // 1 hour in seconds
    };
  }
}