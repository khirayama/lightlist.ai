import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
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
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const initAuth = () => {
      // ブラウザー環境でのみ localStorage にアクセス
      if (typeof window === 'undefined') return;
      
      try {
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        const userStr = localStorage.getItem('user');

        if (token && refreshToken && userStr) {
          const user = JSON.parse(userStr);
          setAuthState({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
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
      // TODO: Replace with actual API call
      const mockResponse = {
        user: { id: '1', email },
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
      };

      // ブラウザー環境でのみ localStorage にアクセス
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', mockResponse.token);
        localStorage.setItem('refreshToken', mockResponse.refreshToken);
        localStorage.setItem('user', JSON.stringify(mockResponse.user));
      }

      setAuthState({
        user: mockResponse.user,
        token: mockResponse.token,
        refreshToken: mockResponse.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string): Promise<void> => {
    try {
      // TODO: Replace with actual API call
      const mockResponse = {
        user: { id: '1', email },
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
      };

      // ブラウザー環境でのみ localStorage にアクセス
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', mockResponse.token);
        localStorage.setItem('refreshToken', mockResponse.refreshToken);
        localStorage.setItem('user', JSON.stringify(mockResponse.user));
      }

      setAuthState({
        user: mockResponse.user,
        token: mockResponse.token,
        refreshToken: mockResponse.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = (): void => {
    // ブラウザー環境でのみ localStorage にアクセス
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }

    setAuthState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const updateUser = (user: User): void => {
    // ブラウザー環境でのみ localStorage にアクセス
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
    setAuthState(prev => ({ ...prev, user }));
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateUser,
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