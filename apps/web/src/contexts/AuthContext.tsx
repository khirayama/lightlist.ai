import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { sdkClient, saveAuthToStorage, clearAuthFromStorage, restoreAuthFromStorage, getDeviceId } from '../lib/sdk-client';
import type { User, AuthResponse } from '@lightlist/sdk';

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false, // SSRとCSRで一貫性を保つため false に変更
    error: null,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const initAuth = () => {
      // ブラウザー環境でのみ localStorage にアクセス
      if (typeof window === 'undefined') return;
      
      try {
        // SDKクライアントから認証状態を復元
        restoreAuthFromStorage();
        
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const userStr = localStorage.getItem('user');

        if (accessToken && refreshToken && userStr) {
          const user = JSON.parse(userStr);
          setAuthState({
            user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const response: AuthResponse = await sdkClient.auth.login({
        email,
        password,
        deviceId: getDeviceId(),
      });

      // 認証情報を保存
      saveAuthToStorage(response.data.token, response.data.refreshToken);
      
      // ユーザー情報をlocalStorageに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      setAuthState({
        user: response.data.user,
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'ログインに失敗しました';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const register = async (email: string, password: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const response: AuthResponse = await sdkClient.auth.register({
        email,
        password,
        deviceId: getDeviceId(),
      });

      // 認証情報を保存
      saveAuthToStorage(response.data.token, response.data.refreshToken);
      
      // ユーザー情報をlocalStorageに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      setAuthState({
        user: response.data.user,
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Registration failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'ユーザー登録に失敗しました';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await sdkClient.auth.logout();
      
      // 認証情報をクリア
      clearAuthFromStorage();
      
      // ユーザー情報もlocalStorageから削除
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }
      
      setAuthState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // ログアウトが失敗してもローカル状態はクリアする
      clearAuthFromStorage();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }
      setAuthState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  const updateUser = (user: User): void => {
    // ブラウザー環境でのみ localStorage にアクセス
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
    setAuthState(prev => ({ ...prev, user }));
  };

  const clearError = (): void => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};