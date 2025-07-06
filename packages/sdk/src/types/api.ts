// API関連型定義

import * as Y from 'yjs';

// API関連
export interface ApiResponse<T> {
  data: T;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// 認証関連
export interface AuthCredential {
  email: string;
  password: string;
  deviceId: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  deviceId: string;
}

// 共同編集関連
export interface CollaborativeSession {
  id: string;
  taskListId: string;
  deviceId: string;
  sessionType: 'active' | 'background';
  expiresAt: string;
  isActive: boolean;
}

export interface CollaborativeState {
  documentState: string; // Base64エンコードされたY.jsドキュメント
  stateVector: string;   // Base64エンコードされたステートベクター
  hasUpdates: boolean;
}

// 共有関連
export interface TaskListShare {
  taskListId: string;
  shareToken: string;
  shareUrl: string;
  isActive: boolean;
}

// Y.js関連
export interface YjsOperation {
  type: 'insert' | 'update' | 'delete' | 'move';
  taskListId: string;
  taskId?: string;
  position?: number;
  data?: any;
}

export interface YjsDocumentManager {
  getDoc(taskListId: string): Y.Doc;
  applyUpdate(taskListId: string, update: Uint8Array): void;
  createSnapshot(taskListId: string): Uint8Array;
  subscribeToUpdates(taskListId: string, callback: (update: Uint8Array) => void): () => void;
}