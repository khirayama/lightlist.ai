import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  language: 'ja' | 'en';
}

interface AppSettings {
  id: string;
  taskInsertPosition: 'top' | 'bottom';
  autoSort: boolean;
}

interface FormErrors {
  general?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [userSettings, setUserSettings] = useState<UserSettings>({
    theme: 'system',
    language: 'ja'
  });
  const [appSettings, setAppSettings] = useState<AppSettings>({
    id: '',
    taskInsertPosition: 'top',
    autoSort: false
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 認証チェック
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  // 設定データの取得
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('認証トークンが見つかりません');
        }
        
        console.log('設定取得開始');

        // ユーザー設定とApp設定を並列取得
        const [userResponse, appResponse] = await Promise.all([
          fetch('http://localhost:3001/api/settings', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }),
          fetch('http://localhost:3001/api/app', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })
        ]);

        console.log('取得レスポンス:', {
          userStatus: userResponse.status,
          appStatus: appResponse.status
        });

        // 認証エラーの場合、ログイン画面にリダイレクト
        if (userResponse.status === 401 || appResponse.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          router.push('/login');
          return;
        }

        const userData = await userResponse.json();
        const appData = await appResponse.json();

        console.log('取得データ:', { userData, appData });

        if (!userResponse.ok) {
          throw new Error(userData.message || `ユーザー設定の取得に失敗しました (${userResponse.status})`);
        }

        if (!appResponse.ok) {
          throw new Error(appData.message || `App設定の取得に失敗しました (${appResponse.status})`);
        }

        if (userData.data) {
          setUserSettings(userData.data);
          console.log('ユーザー設定設定:', userData.data);
        }
        
        if (appData.data) {
          setAppSettings(appData.data);
          console.log('App設定設定:', appData.data);
        }

        console.log('設定取得完了');
      } catch (error) {
        console.error('設定取得エラー:', error);
        setErrors({
          general: error instanceof Error ? error.message : '設定の取得に失敗しました'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [isAuthenticated, router]);

  const handleUserSettingChange = (key: keyof UserSettings, value: string) => {
    setUserSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAppSettingChange = (key: keyof Omit<AppSettings, 'id'>, value: string | boolean) => {
    setAppSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrors({});

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('認証トークンが見つかりません。再ログインしてください。');
      }

      console.log('設定保存開始:', { userSettings, appSettings });

      // ユーザー設定とApp設定を並列更新
      const [userResponse, appResponse] = await Promise.all([
        fetch('http://localhost:3001/api/settings', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            theme: userSettings.theme,
            language: userSettings.language
          }),
        }),
        fetch('http://localhost:3001/api/app', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            taskInsertPosition: appSettings.taskInsertPosition,
            autoSort: appSettings.autoSort
          }),
        })
      ]);

      console.log('APIレスポンス:', {
        userStatus: userResponse.status,
        appStatus: appResponse.status
      });

      // 認証エラーの場合、ログイン画面にリダイレクト
      if (userResponse.status === 401 || appResponse.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }

      // レスポンスのJSONデータを取得
      const [userData, appData] = await Promise.all([
        userResponse.json(),
        appResponse.json()
      ]);

      console.log('レスポンスデータ:', { userData, appData });

      if (!userResponse.ok) {
        throw new Error(userData.message || `ユーザー設定の保存に失敗しました (${userResponse.status})`);
      }

      if (!appResponse.ok) {
        throw new Error(appData.message || `App設定の保存に失敗しました (${appResponse.status})`);
      }

      // 保存成功時にローカル状態を更新
      if (userData.data) {
        setUserSettings(userData.data);
      }
      if (appData.data) {
        setAppSettings(appData.data);
      }

      console.log('設定保存完了');
      alert('設定を保存しました');
    } catch (error) {
      console.error('設定保存エラー:', error);
      setErrors({
        general: error instanceof Error ? error.message : '設定の保存に失敗しました'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated || isLoading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>設定</h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>設定</h1>

      {errors.general && (
        <div style={{ 
          color: 'red', 
          padding: '10px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {errors.general}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* ユーザー設定セクション */}
        <div>
          <h2 style={{ borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>ユーザー設定</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <div>
              <label htmlFor="theme" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                テーマ
              </label>
              <select
                id="theme"
                value={userSettings.theme}
                onChange={(e) => handleUserSettingChange('theme', e.target.value as UserSettings['theme'])}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                disabled={isSaving}
              >
                <option value="system">システム</option>
                <option value="light">ライト</option>
                <option value="dark">ダーク</option>
              </select>
            </div>

            <div>
              <label htmlFor="language" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                言語
              </label>
              <select
                id="language"
                value={userSettings.language}
                onChange={(e) => handleUserSettingChange('language', e.target.value as UserSettings['language'])}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                disabled={isSaving}
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* App設定セクション */}
        <div>
          <h2 style={{ borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>App設定</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <div>
              <label htmlFor="taskInsertPosition" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                タスク挿入位置
              </label>
              <select
                id="taskInsertPosition"
                value={appSettings.taskInsertPosition}
                onChange={(e) => handleAppSettingChange('taskInsertPosition', e.target.value as AppSettings['taskInsertPosition'])}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                disabled={isSaving}
              >
                <option value="top">上部</option>
                <option value="bottom">下部</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={appSettings.autoSort}
                  onChange={(e) => handleAppSettingChange('autoSort', e.target.checked)}
                  disabled={isSaving}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span style={{ fontWeight: 'bold' }}>自動ソート</span>
              </label>
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '12px 24px',
              backgroundColor: isSaving ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isSaving ? '保存中...' : '設定を保存'}
          </button>
        </div>

        {/* ナビゲーション */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/" style={{ color: '#007bff', textDecoration: 'none' }}>
            ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}