import type { Request } from 'express';

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  jti?: string;  // JWT ID（トークンのユニーク識別子）
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  deviceId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  deviceId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId: string;
}

export interface RefreshTokenResponse {
  message: string;
  data: {
    token: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}
