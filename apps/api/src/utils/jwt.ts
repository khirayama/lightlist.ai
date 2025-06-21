import { randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { AuthTokens, JWTPayload, RefreshTokenPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
// const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
// const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '1y';

// アクセストークンの有効期限（ミリ秒）
export const ACCESS_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1時間

// リフレッシュトークンの有効期限（ミリ秒）
export const REFRESH_TOKEN_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1年

/**
 * アクセストークンを生成
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>): string {
  // ユニークなトークンIDを生成（各トークンがユニークになるように）
  const jti = randomBytes(8).toString('hex');
  const iat = Math.floor(Date.now() / 1000);
  
  const tokenPayload = {
    ...payload,
    jti,
    iat,
  };
  
  const options: SignOptions = {
    expiresIn: '1h',
  };
  return jwt.sign(tokenPayload, JWT_SECRET, options);
}

/**
 * リフレッシュトークンを生成
 */
export function generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
  // 現在時刻を明示的に追加（ユニーク性を確保）
  const iat = Math.floor(Date.now() / 1000);
  
  const tokenPayload = {
    ...payload,
    iat,
  };
  
  const options: SignOptions = {
    expiresIn: '1y',
  };
  return jwt.sign(tokenPayload, JWT_SECRET, options);
}

/**
 * アクセストークンを検証
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * リフレッシュトークンを検証
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * アクセストークンとリフレッシュトークンの両方を生成
 */
export function generateTokenPair(userId: string, email: string, deviceId: string): AuthTokens {
  // リフレッシュトークン用のユニークID生成
  const tokenId = randomBytes(16).toString('hex');

  const accessToken = generateAccessToken({ userId, email });
  const refreshToken = generateRefreshToken({ userId, deviceId, tokenId });

  return {
    token: accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_MS,
    refreshExpiresIn: REFRESH_TOKEN_EXPIRY_MS,
  };
}

/**
 * トークンから有効期限を取得
 */
export function getTokenExpiry(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (decoded?.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * パスワードリセット用のランダムトークンを生成
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * パスワードリセットトークンの有効期限（ミリ秒）
 */
export const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1時間

/**
 * パスワードリセットトークンの有効期限を計算
 */
export function getPasswordResetTokenExpiry(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);
}

/**
 * デバイスIDの形式を検証
 */
export function isValidDeviceId(deviceId: string): boolean {
  // UUID形式またはランダム文字列（32文字以上）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const randomStringRegex = /^[a-zA-Z0-9]{32,}$/;

  return uuidRegex.test(deviceId) || randomStringRegex.test(deviceId);
}
