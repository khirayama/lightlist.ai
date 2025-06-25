import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { LightlistSDK, ApiClientError } from '@lightlist/sdk';

// 認証状態の型定義
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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  clearAuth: () => void;
}

// ストレージキー
const AUTH_STORAGE_KEY = 'auth_data';
const DEVICE_ID_STORAGE_KEY = 'device_id';

// SDK クライアントのインスタンス
const sdk = new LightlistSDK(
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'
);

// デバイスID生成
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

// AuthContextの作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProviderのProps
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

  // 認証データをAsyncStorageから読み込み
  const loadAuthData = async () => {
    try {
      const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (authData) {
        const { user, tokens }: { user: User; tokens: AuthTokens } = JSON.parse(authData);
        
        // トークンの有効期限をチェック
        const now = Date.now();
        if (tokens.expiresIn > now) {
          // SDKクライアントに認証情報を設定
          const deviceId = await generateDeviceId();
          sdk.setAuth(tokens.token, tokens.refreshToken, deviceId);
          
          setAuthState({
            user,
            tokens,
            isLoading: false,
            isAuthenticated: true,
          });
        } else if (tokens.refreshExpiresIn > now) {
          // アクセストークンは期限切れだがリフレッシュトークンは有効
          try {
            await refreshTokens();
          } catch (error) {
            console.error('Token refresh failed:', error);
            await clearAuth();
          }
        } else {
          // 全てのトークンが期限切れ
          await clearAuth();
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // 認証データをAsyncStorageに保存
  const saveAuthData = async (user: User, tokens: AuthTokens) => {
    try {
      const authData = { user, tokens };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      
      // SDKクライアントに認証情報を設定
      const deviceId = await generateDeviceId();
      sdk.setAuth(tokens.token, tokens.refreshToken, deviceId);
      
      setAuthState({
        user,
        tokens,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Failed to save auth data:', error);
      throw error;
    }
  };

  // 認証データをクリア
  const clearAuth = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      
      // SDKクライアントから認証情報を削除
      sdk.clearAuth();
      
      setAuthState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  };

  // ログイン
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const deviceId = await generateDeviceId();
      
      const response = await sdk.auth.login({ email, password, deviceId });
      
      await saveAuthData(response.data.user, {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,
        refreshExpiresIn: response.data.refreshExpiresIn,
      });
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      if (error instanceof ApiClientError) {
        throw new Error(error.message || 'ログインに失敗しました');
      }
      throw error;
    }
  };

  // ユーザー登録
  const register = async (email: string, password: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const deviceId = await generateDeviceId();
      
      const response = await sdk.auth.register({ email, password, deviceId });
      
      await saveAuthData(response.data.user, {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,
        refreshExpiresIn: response.data.refreshExpiresIn,
      });
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      if (error instanceof ApiClientError) {
        throw new Error(error.message || 'ユーザー登録に失敗しました');
      }
      throw error;
    }
  };

  // ログアウト
  const logout = async (): Promise<void> => {
    try {
      if (authState.tokens?.token) {
        await sdk.auth.logout();
      }
      await clearAuth();
    } catch (error) {
      console.error('Logout failed:', error);
      // ローカルの認証データは削除する
      await clearAuth();
    }
  };

  // トークンリフレッシュ
  const refreshTokens = async (): Promise<void> => {
    try {
      if (!authState.tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const deviceId = await generateDeviceId();
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
    }
  };

  // 初期化時に認証データを読み込み
  useEffect(() => {
    loadAuthData();
  }, []);

  // プロアクティブトークンリフレッシュ（期限の5分前）
  useEffect(() => {
    if (authState.tokens && authState.isAuthenticated) {
      const timeUntilExpiry = authState.tokens.expiresIn - Date.now();
      const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000); // 5分前

      const timer = setTimeout(() => {
        refreshTokens().catch(console.error);
      }, refreshTime);

      return () => clearTimeout(timer);
    }
  }, [authState.tokens]);

  const contextValue: AuthContextType = {
    ...authState,
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

// useAuth hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};