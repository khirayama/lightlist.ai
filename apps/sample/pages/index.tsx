import { useState, useEffect } from 'react';
import { useSDK } from './_app';
import type { TaskList as TaskListType } from '@lightlist/sdk';


export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [taskLists, setTaskLists] = useState<TaskListType[]>([]);
  const { actions, authService } = useSDK();
  const [error, setError] = useState<string>('');

  // 認証状態をチェック
  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getAccessToken();
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    checkAuth();
  }, [authService]);

  // ログイン済みの場合、タスクリストを取得
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchTaskLists();
    }
  }, [isAuthenticated, isLoading, actions.taskLists]);

  const fetchTaskLists = async () => {
    try {
      const result = await actions.taskLists.getTaskLists();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'タスクリストの取得に失敗しました');
      }
      
      setTaskLists(result.data || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  };

  const handleLogout = async () => {
    try {
      await actions.auth.logout();
      setIsAuthenticated(false);
      setTaskLists([]);
      setError('');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      // エラーが発生してもローカル状態はクリア
      setIsAuthenticated(false);
      setTaskLists([]);
      setError('');
    }
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
                    {taskList.tasks && (
                      <span style={{ marginLeft: '10px', color: '#666' }}>
                        ({taskList.tasks.length} タスク)
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