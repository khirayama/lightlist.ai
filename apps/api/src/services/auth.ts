import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import prisma from '@/config/database';
import { JwtPayload } from '@/types';

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
  private static readonly ACCESS_TOKEN_EXPIRES_IN = '1h';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '30d';

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
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const tokens = await this.generateTokens(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.deviceId
    );

    return tokens;
  }

  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        token: refreshToken,
      },
      data: {
        isActive: false,
      },
    });
  }

  private static async generateTokens(
    userId: string,
    email: string,
    deviceId: string
  ): Promise<AuthTokens> {
    const accessTokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId,
      email,
    };

    const accessToken = jwt.sign(accessTokenPayload, config.jwt.secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    });

    const refreshTokenValue = jwt.sign(
      { userId, deviceId },
      config.jwt.secret,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
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

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 3600, // 1 hour in seconds
    };
  }
}