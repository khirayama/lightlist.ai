import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { setTimeout } from 'timers/promises';

let apiServer: ChildProcess | null = null;
const API_PORT = 3002; // 3001の代わりに3002を使用
const API_BASE_URL = `http://localhost:${API_PORT}`;

export default async function globalSetup() {
  console.log('🚀 Starting global setup - API server initialization...');
  
  // 既存のプロセスをチェックして停止
  try {
    const { execSync } = require('child_process');
    execSync(`lsof -ti:${API_PORT} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    await setTimeout(2000); // 停止処理を待機
  } catch (error) {
    // プロセス停止エラーは無視
  }

  console.log('Starting API server for integration tests...');
  
  // API サーバーのディレクトリパス
  const apiPath = join(__dirname, '../../../../apps/api');
  
  // APIサーバーを起動（テスト用データベースを使用）
  apiServer = spawn('npm', ['run', 'dev'], {
    cwd: apiPath,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: API_PORT.toString(),
      DATABASE_URL: 'postgresql://lightlist_user:lightlist_password@localhost:5435/lightlist_test_db?schema=public'
    },
    stdio: 'pipe' // ログを制御するため
  });

  let serverReady = false;
  
  // サーバーの出力を監視
  if (apiServer.stdout) {
    apiServer.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running on port')) {
        serverReady = true;
      }
      // デバッグモード時のみログ出力
      if (process.env.DEBUG_INTEGRATION) {
        console.log(`API Server: ${output}`);
      }
    });
  }

  if (apiServer.stderr) {
    apiServer.stderr.on('data', (data) => {
      const output = data.toString();
      // エラーは常に表示
      console.error(`API Server Error: ${output}`);
    });
  }

  // サーバーの起動を待機（最大30秒）
  const maxWaitTime = 30000;
  const checkInterval = 500;
  let waitedTime = 0;
  
  while (!serverReady && waitedTime < maxWaitTime) {
    await setTimeout(checkInterval);
    waitedTime += checkInterval;
    
    // ヘルスチェックも試行
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        serverReady = true;
        break;
      }
    } catch (error) {
      // まだサーバーが起動していない
    }
  }

  if (!serverReady) {
    throw new Error('API server failed to start within 30 seconds');
  }

  console.log('✅ Global setup completed - API server is ready');
  
  const apiServerInfo = {
    port: API_PORT,
    baseUrl: API_BASE_URL,
    apiBaseUrl: `${API_BASE_URL}/api`
  };
  
  // グローバル変数としてAPIサーバーの情報を保存
  (globalThis as any).__API_SERVER_INFO__ = apiServerInfo;
  
  // ファイルにも保存（フォールバック用）
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, 'api-server-config.json');
  fs.writeFileSync(configPath, JSON.stringify(apiServerInfo, null, 2));

  // ティアダウン関数を返す
  return async () => {
    console.log('🛑 Starting global teardown - API server shutdown...');
    
    if (!apiServer) {
      console.log('No API server to stop');
      return;
    }

    console.log('Stopping API server...');
    
    // Graceful shutdown を試行
    apiServer.kill('SIGTERM');
    
    // 5秒待ってもプロセスが終了しない場合は強制終了
    await setTimeout(5000);
    
    if (!apiServer.killed) {
      console.log('Forcing API server shutdown...');
      apiServer.kill('SIGKILL');
    }
    
    apiServer = null;
    console.log('✅ Global teardown completed - API server stopped');
    
    // グローバル変数をクリア
    delete (globalThis as any).__API_SERVER_INFO__;
    
    // 設定ファイルも削除
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, 'api-server-config.json');
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    } catch (error) {
      console.log('Failed to clean up config file:', error);
    }
  };
}