import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

interface UseAuthGuardResult {
  shouldRender: boolean;
  isLoading: boolean;
  isRedirecting: boolean;
}

export const useAuthGuard = (requireAuth: boolean): UseAuthGuardResult => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // デバッグログ
    console.log('useAuthGuard:', {
      requireAuth,
      isLoading,
      isAuthenticated,
      currentPath: router.asPath
    });

    if (requireAuth && !isLoading && !isAuthenticated) {
      console.log('Redirecting to login from:', router.asPath);
      
      // 現在のパスを保存してログイン後に戻れるようにする
      const returnTo = router.asPath;
      const loginUrl = returnTo === '/settings' 
        ? `/login?returnTo=${encodeURIComponent(returnTo)}`
        : '/login';
      
      router.push(loginUrl);
    }
  }, [requireAuth, isLoading, isAuthenticated, router, router.asPath]);

  return {
    shouldRender: !requireAuth || isAuthenticated,
    isLoading: requireAuth && isLoading,
    isRedirecting: requireAuth && !isLoading && !isAuthenticated
  };
};