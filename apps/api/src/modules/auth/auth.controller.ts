import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '@/shared/utils/response';
import { validateRequest } from '@/shared/utils/validation';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/shared/utils/validation';

export class AuthController {
  static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password, deviceId } = validateRequest(
        registerSchema,
        req.body
      );

      const result = await AuthService.register(email, password, deviceId);

      sendSuccess(
        res,
        {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn,
        },
        'User registered successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password, deviceId } = validateRequest(
        loginSchema,
        req.body
      );

      const result = await AuthService.login(email, password, deviceId);

      sendSuccess(
        res,
        {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn,
        },
        'Login successful'
      );
    } catch (error) {
      next(error);
    }
  }

  static async refresh(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { refreshToken } = validateRequest(refreshTokenSchema, req.body);

      const tokens = await AuthService.refresh(refreshToken);

      sendSuccess(
        res,
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
        'Token refreshed successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { refreshToken } = validateRequest(refreshTokenSchema, req.body);

      await AuthService.logout(refreshToken);

      sendSuccess(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = validateRequest(forgotPasswordSchema, req.body);

      await AuthService.forgotPassword(email);

      sendSuccess(res, null, 'Password reset email sent');
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token, newPassword } = validateRequest(resetPasswordSchema, req.body);

      await AuthService.resetPassword(token, newPassword);

      sendSuccess(res, null, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }
}
