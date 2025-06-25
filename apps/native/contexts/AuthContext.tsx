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

  // 初期化完了フラグ
  const [isInitialized, setIsInitialized] = useState(false);
  
  // リフレッシュ実行中フラグ
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // プロアクティブリフレッシュタイマーの参照
  const [refreshTimerId, setRefreshTimerId] = useState<number | null>(null);

  // 認証データをAsyncStorageから読み込み
  const loadAuthData = async () => {
    console.log('[AuthContext] Starting loadAuthData');
    
    try {
      const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (authData) {
        console.log('[AuthContext] Found stored auth data');
        const { user, tokens }: { user: User; tokens: AuthTokens } = JSON.parse(authData);
        
        // トークンの有効期限をチェック
        const now = Date.now();
        console.log('[AuthContext] Token expiry check:', {
          now: new Date(now).toISOString(),
          accessTokenExpiry: new Date(tokens.expiresIn).toISOString(),
          refreshTokenExpiry: new Date(tokens.refreshExpiresIn).toISOString(),
        });
        
        if (tokens.expiresIn > now) {
          console.log('[AuthContext] Access token still valid, setting auth state');
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
          console.log('[AuthContext] Access token expired but refresh token valid, refreshing');
          // アクセストークンは期限切れだがリフレッシュトークンは有効
          try {
            // 一時的に認証状態を設定してrefreshTokensが動作するようにする
            setAuthState({
              user,
              tokens,
              isLoading: false,
              isAuthenticated: true,
            });
            await refreshTokens();
          } catch (error) {
            console.error('[AuthContext] Initial token refresh failed:', error);
            await clearAuth();
          }
        } else {
          console.log('[AuthContext] All tokens expired, clearing auth');
          // 全てのトークンが期限切れ
          await clearAuth();
        }
      } else {
        console.log('[AuthContext] No stored auth data found');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('[AuthContext] Failed to load auth data:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } finally {
      // 初期化完了
      console.log('[AuthContext] Initialization completed');
      setIsInitialized(true);
    }
  };

  // 認証データをAsyncStorageに保存
  const saveAuthData = async (user: User, tokens: AuthTokens) => {
    console.log('[AuthContext] Saving auth data');
    
    try {
      // APIから受け取った相対時間を絶対時間に変換
      const currentTime = Date.now();
      const absoluteTokens: AuthTokens = {
        ...tokens,
        expiresIn: currentTime + tokens.expiresIn,        // 相対時間 → 絶対時間
        refreshExpiresIn: currentTime + tokens.refreshExpiresIn, // 相対時間 → 絶対時間
      };
      
      console.log('[AuthContext] Converting relative time to absolute time:', {
        currentTime: new Date(currentTime).toISOString(),
        originalExpiresIn: tokens.expiresIn + 'ms (relative)',
        originalRefreshExpiresIn: tokens.refreshExpiresIn + 'ms (relative)',
        convertedExpiresIn: new Date(absoluteTokens.expiresIn).toISOString(),
        convertedRefreshExpiresIn: new Date(absoluteTokens.refreshExpiresIn).toISOString(),
      });
      
      const authData = { user, tokens: absoluteTokens };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      
      // SDKクライアントに認証情報を設定
      const deviceId = await generateDeviceId();
      sdk.setAuth(absoluteTokens.token, absoluteTokens.refreshToken, deviceId);
      
      setAuthState({
        user,
        tokens: absoluteTokens,
        isLoading: false,
        isAuthenticated: true,
      });
      
      console.log('[AuthContext] Auth data saved successfully with absolute timestamps');
    } catch (error) {
      console.error('[AuthContext] Failed to save auth data:', error);
      throw error;
    }
  };

  // 認証データをクリア
  const clearAuth = async () => {
    console.log('[AuthContext] Clearing auth data');
    
    try {
      // プロアクティブリフレッシュタイマーをクリア
      if (refreshTimerId) {
        clearTimeout(refreshTimerId);
        setRefreshTimerId(null);
      }
      
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      
      // SDKクライアントから認証情報を削除
      sdk.clearAuth();
      
      setAuthState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      console.log('[AuthContext] Auth data cleared successfully');
    } catch (error) {
      console.error('[AuthContext] Failed to clear auth data:', error);
    }
  };

  // ログイン
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const deviceId = await generateDeviceId();
      
      const response = await sdk.auth.login({ email, password, deviceId });
      
      // APIレスポンス: 相対時間（ミリ秒）→ saveAuthDataで絶対時間に変換
      await saveAuthData(response.data.user, {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,        // 相対時間（例: 3600000ms = 1時間）
        refreshExpiresIn: response.data.refreshExpiresIn, // 相対時間（例: 31536000000ms = 1年）
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
      
      // APIレスポンス: 相対時間（ミリ秒）→ saveAuthDataで絶対時間に変換
      await saveAuthData(response.data.user, {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,        // 相対時間（例: 3600000ms = 1時間）
        refreshExpiresIn: response.data.refreshExpiresIn, // 相対時間（例: 31536000000ms = 1年）
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
    // 既にリフレッシュ中の場合は実行しない
    if (isRefreshing) {
      console.log('[AuthContext] Refresh already in progress, skipping');
      return;
    }

    console.log('[AuthContext] Starting token refresh');

    try {
      setIsRefreshing(true);
      
      if (!authState.tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const deviceId = await generateDeviceId();
      console.log('[AuthContext] Calling SDK refresh with deviceId:', deviceId);
      
      const response = await sdk.auth.refresh({
        refreshToken: authState.tokens.refreshToken,
        deviceId
      });

      console.log('[AuthContext] SDK refresh successful, updating auth data');

      if (authState.user) {
        // APIレスポンス: 相対時間（ミリ秒）→ saveAuthDataで絶対時間に変換
        await saveAuthData(authState.user, {
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          expiresIn: response.data.expiresIn,        // 相対時間（例: 3600000ms = 1時間）
          refreshExpiresIn: response.data.refreshExpiresIn, // 相対時間（例: 31536000000ms = 1年）
        });
        
        console.log('[AuthContext] Auth data updated successfully');
      }
    } catch (error) {
      console.error('[AuthContext] Token refresh failed:', error);
      await clearAuth();
      throw error;
    } finally {
      setIsRefreshing(false);
      console.log('[AuthContext] Token refresh completed');
    }
  };

  // 初期化時に認証データを読み込み
  useEffect(() => {
    loadAuthData();
  }, []);

  // プロアクティブトークンリフレッシュ（期限の5分前）
  useEffect(() => {
    // 既存のタイマーをクリア
    if (refreshTimerId) {
      clearTimeout(refreshTimerId);
      setRefreshTimerId(null);
    }

    // 初期化完了後かつ認証済みでリフレッシュ中でない場合のみ実行
    if (isInitialized && authState.isAuthenticated && authState.tokens && !isRefreshing) {
      const currentTime = Date.now();
      const expiryTime = authState.tokens.expiresIn;
      const timeUntilExpiry = expiryTime - currentTime;
      const refreshTime = Math.max(1000, timeUntilExpiry - 5 * 60 * 1000); // 5分前、最低1秒

      console.log('[AuthContext] Setting proactive refresh timer:', {
        currentTime: new Date(currentTime).toISOString(),
        expiryTime: new Date(expiryTime).toISOString(),
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000) + 's',
        refreshTime: Math.round(refreshTime / 1000) + 's',
      });

      // 既に期限切れ間近の場合は即座にリフレッシュ
      if (timeUntilExpiry <= 5 * 60 * 1000) {
        console.log('[AuthContext] Token near expiry, refreshing immediately');
        refreshTokens().catch(console.error);
        return;
      }

      const timer = setTimeout(() => {
        console.log('[AuthContext] Proactive refresh timer triggered');
        refreshTokens().catch(console.error);
      }, refreshTime);

      setRefreshTimerId(timer);
    }

    return () => {
      if (refreshTimerId) {
        clearTimeout(refreshTimerId);
        setRefreshTimerId(null);
      }
    };
  }, [authState.tokens?.expiresIn, authState.isAuthenticated, isInitialized]);

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