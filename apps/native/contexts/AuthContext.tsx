import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { LightlistSDK, ApiClientError } from '@lightlist/sdk';

// Type definitions
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  clearAuth: () => void;
}

// Storage keys
const AUTH_STORAGE_KEY = 'auth_data';
const DEVICE_ID_STORAGE_KEY = 'device_id';

// SDK client instance
const sdk = new LightlistSDK(
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080'
);

// Device ID generation
const generateDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    }
    return deviceId;
  } catch (error) {
    console.error('Failed to generate device ID:', error);
    return 'fallback-device-id';
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    tokens: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTimerId, setRefreshTimerId] = useState<any | null>(null);

  useEffect(() => {
    const getDeviceId = async () => {
      const id = await generateDeviceId();
      setDeviceId(id);
    };
    getDeviceId();
  }, []);

  const loadAuthData = async () => {
    if (!deviceId) return;
    try {
      const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (authData) {
        const { user, tokens }: { user: User; tokens: AuthTokens } = JSON.parse(authData);
        const now = Date.now();
        
        if (tokens.expiresIn > now) {
          sdk.setAuth(tokens.token, tokens.refreshToken, deviceId);
          setAuthState({ user, tokens, isLoading: false, isAuthenticated: true });
        } else if (tokens.refreshExpiresIn > now) {
          setAuthState({ user, tokens, isLoading: false, isAuthenticated: true });
          await refreshTokens();
        } else {
          await clearAuth();
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } finally {
      setIsInitialized(true);
    }
  };

  const saveAuthData = async (user: User, tokens: AuthTokens) => {
    if (!deviceId) return;
    try {
      const currentTime = Date.now();
      const absoluteTokens: AuthTokens = {
        ...tokens,
        expiresIn: currentTime + tokens.expiresIn,
        refreshExpiresIn: currentTime + tokens.refreshExpiresIn,
      };
      
      const authData = { user, tokens: absoluteTokens };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      
      sdk.setAuth(absoluteTokens.token, absoluteTokens.refreshToken, deviceId);
      
      setAuthState({ user, tokens: absoluteTokens, isLoading: false, isAuthenticated: true });
    } catch (error) {
      console.error('Failed to save auth data:', error);
      throw error;
    }
  };

  const clearAuth = async () => {
    if (refreshTimerId) {
      clearTimeout(refreshTimerId);
      setRefreshTimerId(null);
    }
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    sdk.clearAuth();
    setAuthState({ user: null, tokens: null, isLoading: false, isAuthenticated: false });
  };

  const login = async (email: string, password: string): Promise<void> => {
    if (!deviceId) throw new Error("Device ID not initialized");
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const response = await sdk.auth.login({ email, password, deviceId });
      await saveAuthData(response.data.user, {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,
        refreshExpiresIn: response.data.refreshExpiresIn,
      });

      // タスクリストが存在しない場合は最初のタスクリストを自動生成
      try {
        const taskListsResponse = await sdk.taskList.getTaskLists();
        if (taskListsResponse.data?.taskLists?.length === 0) {
          // TODO: 多言語対応のため、設定から言語を取得
          const taskListName = '📝個人'; // デフォルトは日本語
          await sdk.taskList.createTaskList({ name: taskListName });
        }
      } catch (taskListError) {
        console.error('Failed to create initial task list:', taskListError);
        // タスクリスト作成の失敗はログインの失敗ではないため、エラーを投げない
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      if (error instanceof ApiClientError) {
        throw new Error(error.message || 'ログインに失敗しました');
      }
      throw error;
    }
  };

  const register = async (email: string, password: string): Promise<void> => {
    if (!deviceId) throw new Error("Device ID not initialized");
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const response = await sdk.auth.register({ email, password, deviceId });
      await saveAuthData(response.data.user, {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,
        refreshExpiresIn: response.data.refreshExpiresIn,
      });

      // 最初のタスクリストを自動生成
      try {
        // TODO: 多言語対応のため、設定から言語を取得
        const taskListName = '📝個人'; // デフォルトは日本語
        await sdk.taskList.createTaskList({ name: taskListName });
      } catch (taskListError) {
        console.error('Failed to create initial task list:', taskListError);
        // タスクリスト作成の失敗は登録の失敗ではないため、エラーを投げない
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      if (error instanceof ApiClientError) {
        throw new Error(error.message || 'ユーザー登録に失敗しました');
      }
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (authState.tokens?.token) {
        await sdk.auth.logout();
      }
    } catch (error) {
      console.error('Logout failed, clearing local data anyway:', error);
    } finally {
      await clearAuth();
    }
  };

  const refreshTokens = async (): Promise<void> => {
    if (isRefreshing) return;
    if (!authState.tokens?.refreshToken || !deviceId) {
        await clearAuth();
        throw new Error('No refresh token or deviceId available for refresh');
    }

    try {
      setIsRefreshing(true);
      const response = await sdk.auth.refresh({
        refreshToken: authState.tokens.refreshToken,
        deviceId
      });

      if (authState.user) {
        await saveAuthData(authState.user, {
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          expiresIn: response.data.expiresIn,
          refreshExpiresIn: response.data.refreshExpiresIn,
        });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await clearAuth();
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      loadAuthData();
    }
  }, [deviceId]);

  useEffect(() => {
    if (refreshTimerId) {
      clearTimeout(refreshTimerId);
    }

    if (isInitialized && authState.isAuthenticated && authState.tokens && !isRefreshing) {
      const currentTime = Date.now();
      const expiryTime = authState.tokens.expiresIn;
      const timeUntilExpiry = expiryTime - currentTime;
      const refreshTime = Math.max(1000, timeUntilExpiry - 5 * 60 * 1000);

      if (timeUntilExpiry <= 5 * 60 * 1000) {
        refreshTokens().catch(console.error);
        return;
      }

      const timer = setTimeout(() => {
        refreshTokens().catch(console.error);
      }, refreshTime);

      setRefreshTimerId(timer);
    }

    return () => {
      if (refreshTimerId) {
        clearTimeout(refreshTimerId);
      }
    };
  }, [authState.tokens?.expiresIn, authState.isAuthenticated, isInitialized]);

  const contextValue: AuthContextType = {
    ...authState,
    accessToken: authState.tokens?.token || null,
    refreshToken: authState.tokens?.refreshToken || null,
    deviceId,
    login,
    register,
    logout,
    refreshTokens,
    clearAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};