import { PrismaClient } from '@prisma/client';

/**
 * データベースサービス - シングルトンパターンでPrismaClientを管理
 * テスト環境では適切なテスト用データベースに接続する
 */
class DatabaseService {
  private static instance: DatabaseService;
  private prismaClient: PrismaClient | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getClient(): PrismaClient {
    if (!this.prismaClient) {
      const databaseUrl = process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
      }

      this.prismaClient = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
        log: process.env.NODE_ENV === 'test' ? [] : ['query', 'error', 'warn'],
      });

      // テスト環境でのログ出力
      if (process.env.NODE_ENV === 'test') {
        console.log('DatabaseService: Created PrismaClient for test environment');
        console.log('DatabaseService: Using DATABASE_URL:', databaseUrl);
      }
    }

    return this.prismaClient;
  }

  public async disconnect(): Promise<void> {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
      this.prismaClient = null;
      
      if (process.env.NODE_ENV === 'test') {
        console.log('DatabaseService: Disconnected PrismaClient');
      }
    }
  }

  public async reset(): Promise<void> {
    if (this.prismaClient) {
      await this.disconnect();
    }
    // 次回getClient()呼び出し時に新しいインスタンスを作成
  }
}

// シングルトンインスタンスのエクスポート
export const databaseService = DatabaseService.getInstance();

// 便利関数のエクスポート
export function getDatabase(): PrismaClient {
  return databaseService.getClient();
}

export async function disconnectDatabase(): Promise<void> {
  return databaseService.disconnect();
}

export async function resetDatabase(): Promise<void> {
  return databaseService.reset();
}