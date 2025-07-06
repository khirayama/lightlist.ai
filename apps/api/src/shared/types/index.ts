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

export interface CollaborativeSessionRequest {
  sessionType?: 'active' | 'background';
}

export interface UpdateRequest {
  update: string; // Base64-encoded Y.js update
}

export interface CollaborativeSessionResponse {
  sessionId: string;
  documentState: string; // Base64-encoded Y.js document
  stateVector: string; // Base64-encoded state vector
  expiresAt: string;
}

export interface StateResponse {
  documentState: string;
  stateVector: string;
  hasUpdates: boolean;
}

export interface UpdateResponse {
  success: boolean;
  stateVector: string;
}

export interface TaskListCreateRequest {
  name: string;
  background?: string;
}

export interface TaskListUpdateRequest {
  name?: string;
  background?: string;
}

export interface TaskCreateRequest {
  text: string;
  date?: string;
}

export interface TaskUpdateRequest {
  text?: string;
  completed?: boolean;
  date?: string;
}

export interface ShareResponse {
  shareToken: string;
  shareUrl: string;
}

export interface SharedTaskListResponse {
  taskList: {
    id: string;
    name: string;
    background: string;
    tasks: Array<{
      id: string;
      text: string;
      completed: boolean;
      date?: string;
    }>;
  };
  isReadOnly: boolean;
}