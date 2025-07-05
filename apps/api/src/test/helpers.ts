import prisma from '@/config/database';

export const cleanDatabase = async () => {
  // 外部キー制約を考慮した順序で、効率的にバッチ削除
  try {
    await prisma.$transaction(async (tx) => {
      // 子テーブルから先に削除
      await tx.passwordResetToken.deleteMany({});
      await tx.refreshToken.deleteMany({});
      await tx.collaborativeSession.deleteMany({});
      await tx.taskListDocument.deleteMany({});
      await tx.taskListShare.deleteMany({});
      await tx.task.deleteMany({});
      await tx.taskList.deleteMany({});
      
      // 親テーブルを削除
      await tx.settings.deleteMany({});
      await tx.app.deleteMany({});
      await tx.user.deleteMany({});
    }, {
      timeout: 10000, // 10秒のタイムアウト
    });
  } catch (error) {
    console.error('Database cleanup failed:', error);
    throw error;
  }
};

export const createTestUser = async (userData: {
  email: string;
  password: string;
  deviceId: string;
}) => {
  // テスト用ユーザー作成のヘルパー関数
  const response = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create test user: ${response.status}`);
  }

  return await response.json();
};