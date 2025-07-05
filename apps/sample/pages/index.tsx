import { useState, useEffect } from 'react';

interface TaskList {
  id: string;
  name: string;
  background: string;
  taskCount?: number;
}

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [error, setError] = useState<string>('');

  // 認証状態をチェック
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // ログイン済みの場合、タスクリストを取得
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchTaskLists();
    }
  }, [isAuthenticated, isLoading]);

  const fetchTaskLists = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3001/api/tasklists', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('タスクリストの取得に失敗しました');
      }

      const data = await response.json();
      setTaskLists(data.data || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    setTaskLists([]);
    setError('');
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>LightList SDK Sample App</h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>LightList SDK Sample App</h1>
      <p>SDK動作確認用サンプルアプリです。</p>
      
      {isAuthenticated ? (
        <div>
          <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50' }}>
            <strong>ログイン中</strong>
            <button 
              onClick={handleLogout}
              style={{ marginLeft: '10px', padding: '5px 10px', cursor: 'pointer' }}
            >
              ログアウト
            </button>
          </div>

          <h2>タスクリスト</h2>
          {error && (
            <div style={{ color: 'red', marginBottom: '10px' }}>
              エラー: {error}
            </div>
          )}
          
          {taskLists.length > 0 ? (
            <div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {taskLists.map((taskList) => (
                  <li key={taskList.id} style={{ 
                    marginBottom: '10px', 
                    padding: '10px', 
                    border: '1px solid #ccc',
                    backgroundColor: taskList.background || '#f9f9f9'
                  }}>
                    <strong>{taskList.name}</strong>
                    {taskList.taskCount !== undefined && (
                      <span style={{ marginLeft: '10px', color: '#666' }}>
                        ({taskList.taskCount} タスク)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <button style={{ padding: '10px 20px', marginTop: '10px', cursor: 'pointer' }}>
                新しいタスクリストを作成
              </button>
            </div>
          ) : (
            <p>タスクリストがありません。新しいタスクリストを作成してください。</p>
          )}
          
          <nav style={{ marginTop: '30px' }}>
            <h3>その他の機能</h3>
            <ul>
              <li><a href="/settings">設定</a></li>
            </ul>
          </nav>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#ffeaa7', border: '1px solid #fdcb6e' }}>
            <strong>未ログイン</strong>
          </div>
          
          <nav>
            <h3>アカウント</h3>
            <ul>
              <li><a href="/register">ユーザー登録</a></li>
              <li><a href="/login">ログイン</a></li>
              <li><a href="/forgot-password">パスワードリセット</a></li>
            </ul>
          </nav>
          
          <div style={{ marginTop: '20px' }}>
            <p>ログイン後にタスクリストが表示されます。</p>
          </div>
        </div>
      )}
    </div>
  );
}