import { beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

beforeAll(async () => {
  // テスト用データベースのセットアップ
  // DATABASE_URLはpackage.jsonのテストスクリプトで設定済み
  console.log('Setting up test database...');
  
  try {
    // テスト用データベースのマイグレーション実行
    execSync('DATABASE_URL="postgresql://lightlist_user:lightlist_password@localhost:5435/lightlist_test_db?schema=public" npx prisma migrate dev', { 
      stdio: 'inherit', 
      cwd: process.cwd() 
    });
    console.log('Test database setup completed');
  } catch (error) {
    console.error('Failed to setup test database:', error);
  }
});

afterAll(async () => {
  // テスト後のクリーンアップは不要（次回テスト時に自動リセット）
  console.log('Test completed');
});