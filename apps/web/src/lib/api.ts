import { v4 as uuidv4 } from 'uuid';

// デバイスIDを取得（ブラウザのlocalStorageから、ない場合は新規生成）
const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// レスポンス型定義
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
  details?: string[];
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  token: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskList {
  id: string;
  name: string;
  background: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: string;
  language: string;
}

export interface AppSettings {
  id: string;
  taskListOrder: string[];
  taskInsertPosition: string;
  autoSort: boolean;
  createdAt: string;
  updatedAt: string;
}

// APIクライアントクラス
class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // トークンを取得
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  // リフレッシュトークンを取得
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  // トークンを保存
  private saveTokens(token: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  }

  // トークンをクリア
  private clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  // トークンリフレッシュ
  private async refreshTokens(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
        deviceId: getDeviceId(),
      }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const data: ApiResponse<AuthResponse> = await response.json();
    if (!data.data) {
      throw new Error('Invalid refresh response');
    }

    this.saveTokens(data.data.token, data.data.refreshToken);
    return data.data.token;
  }

  // HTTP リクエストメソッド
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    let token = useAuth ? this.getToken() : null;
    
    // ヘッダーを設定
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token && useAuth) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    let response = await fetch(`${this.baseURL}${endpoint}`, config);

    // 401エラーの場合、トークンリフレッシュを試行
    if (response.status === 401 && useAuth && this.getRefreshToken()) {
      try {
        token = await this.refreshTokens();
        headers.Authorization = `Bearer ${token}`;
        
        response = await fetch(`${this.baseURL}${endpoint}`, {
          ...config,
          headers,
        });
      } catch (error) {
        // リフレッシュ失敗時は元のレスポンスをそのまま返す
        console.error('Token refresh failed:', error);
      }
    }

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  }

  // 認証関連API
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        deviceId: getDeviceId(),
      }),
    }, false);

    if (response.data) {
      this.saveTokens(response.data.token, response.data.refreshToken);
      // ユーザー情報をlocalStorageに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }

    return response.data!;
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        deviceId: getDeviceId(),
      }),
    }, false);

    if (response.data) {
      this.saveTokens(response.data.token, response.data.refreshToken);
      // ユーザー情報をlocalStorageに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }

    return response.data!;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  async forgotPassword(email: string): Promise<void> {
    await this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, false);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }, false);
  }

  // ユーザー関連API
  async getUserProfile(userId: string): Promise<User> {
    const response = await this.request<{ user: User }>(`/api/users/${userId}/profile`);
    return response.data!.user;
  }

  async updateUserProfile(userId: string, email: string): Promise<User> {
    const response = await this.request<{ user: User }>(`/api/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify({ email }),
    });
    return response.data!.user;
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.request(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await this.request(`/api/users/${userId}/change-password`, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // 設定関連API
  async getUserSettings(userId: string): Promise<Settings> {
    const response = await this.request<{ settings: Settings }>(`/api/users/${userId}/settings`);
    return response.data!.settings;
  }

  async updateUserSettings(userId: string, settings: Partial<Settings>): Promise<Settings> {
    const response = await this.request<{ settings: Settings }>(`/api/users/${userId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return response.data!.settings;
  }

  async getUserApp(userId: string): Promise<AppSettings> {
    const response = await this.request<{ app: AppSettings }>(`/api/users/${userId}/app`);
    return response.data!.app;
  }

  async updateUserApp(userId: string, settings: Partial<AppSettings>): Promise<AppSettings> {
    const response = await this.request<{ app: AppSettings }>(`/api/users/${userId}/app`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return response.data!.app;
  }

  // タスクリスト関連API
  async getTaskLists(): Promise<TaskList[]> {
    const response = await this.request<{ taskLists: TaskList[] }>('/api/task-lists');
    return response.data!.taskLists;
  }

  async createTaskList(name: string): Promise<TaskList> {
    const response = await this.request<{ taskList: TaskList }>('/api/task-lists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return response.data!.taskList;
  }

  async updateTaskList(taskListId: string, updates: Partial<Pick<TaskList, 'name' | 'background'>>): Promise<TaskList> {
    const response = await this.request<{ taskList: TaskList }>(`/api/task-lists/${taskListId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data!.taskList;
  }

  async deleteTaskList(taskListId: string): Promise<void> {
    await this.request(`/api/task-lists/${taskListId}`, {
      method: 'DELETE',
    });
  }

  async updateTaskListOrder(userId: string, taskListIds: string[]): Promise<string[]> {
    const response = await this.request<{ taskListOrder: string[] }>(`/api/users/${userId}/task-lists/order`, {
      method: 'PUT',
      body: JSON.stringify({ taskListIds }),
    });
    return response.data!.taskListOrder;
  }

  // タスク関連API
  async getTasks(taskListId: string): Promise<Task[]> {
    const response = await this.request<{ tasks: Task[] }>(`/api/task-lists/${taskListId}/tasks`);
    return response.data!.tasks;
  }

  async createTask(taskListId: string, text: string): Promise<Task> {
    const response = await this.request<{ task: Task }>(`/api/task-lists/${taskListId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return response.data!.task;
  }

  async updateTask(taskId: string, updates: Partial<Pick<Task, 'text' | 'completed' | 'date'>>): Promise<Task> {
    const response = await this.request<{ task: Task }>(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data!.task;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.request(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // 共有関連API
  async createShareLink(taskListId: string): Promise<{ shareUrl: string; shareToken: string }> {
    const response = await this.request<{ shareUrl: string; shareToken: string }>(`/api/task-lists/${taskListId}/share`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return response.data!;
  }

  async deleteShareLink(taskListId: string): Promise<void> {
    await this.request(`/api/task-lists/${taskListId}/share`, {
      method: 'DELETE',
    });
  }

  async getSharedTaskList(shareToken: string): Promise<{ taskList: TaskList & { tasks: Task[] } }> {
    const response = await this.request<{ taskList: TaskList & { tasks: Task[] } }>(`/api/share/${shareToken}`, {}, false);
    return response.data!;
  }

  // ヘルスチェック
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.request<{ status: string; timestamp: string }>('/health', {}, false);
    return response.data!;
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();