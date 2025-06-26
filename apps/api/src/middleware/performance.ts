import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

// シンプルなメモリキャッシュ（本番環境では Redis 等を使用推奨）
interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 1000; // 最大キャッシュ数
  private defaultTTL = 300000; // 5分（ミリ秒）

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    // キャッシュサイズ制限
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // 期限切れエントリのクリーンアップ
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new MemoryCache();

// 定期的なキャッシュクリーンアップ（5分ごと）
setInterval(() => {
  cache.cleanup();
}, 300000);

/**
 * レスポンスキャッシュ生成のためのキーを作成
 */
function generateCacheKey(req: Request): string {
  const { method, url } = req;
  const userId = (req as any).userId;
  const key = `${method}:${url}:${userId || 'anonymous'}`;
  return createHash('md5').update(key).digest('hex');
}

/**
 * キャッシュ可能なリクエストかどうかを判定
 */
function isCacheable(req: Request): boolean {
  // GETリクエストのみキャッシュ
  if (req.method !== 'GET') return false;
  
  // 特定のエンドポイントのみキャッシュ
  const cacheableEndpoints = [
    '/api/task-lists',
    '/api/task-lists/.*/tasks$',
    '/api/task-lists/.*/tasks/stats$',
    '/api/users/.*/profile$',
    '/api/users/.*/settings$',
  ];
  
  return cacheableEndpoints.some(pattern => 
    new RegExp(pattern).test(req.path)
  );
}

/**
 * レスポンスキャッシュミドルウェア
 */
export const responseCache = (ttl: number = 300000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // キャッシュ不可能なリクエストはスキップ
    if (!isCacheable(req)) {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      // キャッシュヒット
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'public, max-age=300');
      return res.status(cachedResponse.status).json(cachedResponse.data);
    }

    // オリジナルのjsonメソッドを保存
    const originalJson = res.json;

    // jsonメソッドをオーバーライド
    res.json = function(data: any) {
      // レスポンスをキャッシュに保存
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          status: res.statusCode,
          data: data,
        }, ttl);
      }

      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', 'public, max-age=300');
      
      // オリジナルのjsonメソッドを呼び出し
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * キャッシュ無効化ミドルウェア
 * 作成・更新・削除操作後にキャッシュをクリア
 */
export const invalidateCache = (patterns: string[] = []) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function(data: any) {
      // 成功レスポンスの場合のみキャッシュ無効化
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (patterns.length === 0) {
          // パターンが指定されていない場合は全クリア
          cache.clear();
        } else {
          // TODO: 特定パターンのキャッシュクリア実装
          // 現在はシンプルに全クリア
          cache.clear();
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * レスポンス圧縮設定
 */
export const compressionOptions = {
  level: 6, // 圧縮レベル（1-9）
  threshold: 1024, // 1KB以上のレスポンスを圧縮
  filter: (req: Request, _res: Response) => {
    // 圧縮を適用するかどうかを判定
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // デフォルトの圧縮フィルターを使用
    return true;
  },
};

/**
 * パフォーマンス監視ミドルウェア
 */
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // レスポンス送信前にヘッダーを設定
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    res.set('X-Response-Time', `${duration}ms`);
    
    // デバッグ情報をヘッダーに追加（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      res.set('X-Cache-Size', cache.size().toString());
    }
    
    return originalSend.call(this, data);
  };
  
  // レスポンス完了時の処理（ログのみ）
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, url } = req;
    const { statusCode } = res;
    
    // パフォーマンスログ出力（遅いリクエストのみ）
    if (duration > 1000) { // 1秒以上
      console.warn(`Slow request: ${method} ${url} - ${duration}ms (${statusCode})`);
    }
  });
  
  next();
};

/**
 * キャッシュ統計情報を取得
 */
export const getCacheStats = () => {
  return {
    size: cache.size(),
    maxSize: 1000,
  };
};

/**
 * キャッシュを手動でクリア
 */
export const clearCache = () => {
  cache.clear();
};