export interface ApiResponse<T = any> {
  data: T;
  message: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  email?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  deviceId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface SettingsUpdateRequest {
  theme?: 'system' | 'light' | 'dark';
  language?: string;
}

export interface AppUpdateRequest {
  taskInsertPosition?: 'top' | 'bottom';
  autoSort?: boolean;
}