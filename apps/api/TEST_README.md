# Testing Guide

## テスト実行方法

### ユニットテスト（Docker不要）
データベースに依存しないテスト（バリデーション、JWT、パスワードユーティリティ）

```bash
# ユニットテスト実行
npm run test:unit:run

# ユニットテスト（ウォッチモード）
npm run test:unit

# カバレッジ付きユニットテスト
npm run test:unit:run -- --coverage
```

### 統合テスト（Docker必要）
データベースが必要なテスト（API エンドポイント、認証フロー、ミドルウェア）

```bash
# Docker起動（事前準備）
docker-compose -f docker-compose.test.yml up -d

# 統合テスト実行
npm run test:integration:run

# 統合テスト（ウォッチモード）
npm run test:integration

# Docker停止（事後処理）
docker-compose -f docker-compose.test.yml down
```

### 全テスト実行
```bash
# 全テスト実行（Docker起動状態による自動判定）
npm run test:run
```

## Docker状態での動作

### Docker利用可能時
- PostgreSQLテストデータベースが自動起動
- 完全な統合テスト実行
- 認証フロー、API エンドポイント、データベース操作の全テスト

### Docker利用不可時
- ユニットテストのみ実行
- 統合テストは適切にスキップ
- エラーが発生せず、開発継続可能

## トラブルシューティング

### "Failed to stop test database container" エラー
このエラーは以下の場合に発生します：

1. **Dockerデーモンが起動していない**
   ```bash
   # Docker Desktop を起動
   # または systemctl でDockerサービス開始
   ```

2. **テストコンテナが既に停止済み**
   - エラーメッセージですが、実際は正常終了
   - 手動確認：`docker ps -a | grep lightlist`

3. **権限の問題**
   ```bash
   # Docker権限確認
   docker ps
   ```

### パフォーマンス最適化
- ユニットテストは常に高速実行
- 統合テストは必要時のみ実行
- CI/CD では Docker環境で全テスト実行

## テスト構成

```
src/__tests__/
├── utils/           # ユニットテスト（Docker不要）
│   ├── jwt.test.ts
│   ├── password.test.ts
│   └── validation.test.ts
├── middleware/      # 統合テスト（Docker必要）
│   └── auth.test.ts
├── routes/          # 統合テスト（Docker必要）
│   └── auth.test.ts
└── scenarios/       # 統合テスト（Docker必要）
    └── auth-flow.test.ts
```

## 設定ファイル

- `vitest.unit.config.ts` - ユニットテスト設定
- `vitest.integration.config.ts` - 統合テスト設定  
- `vitest.config.ts` - デフォルト設定（全テスト）
- `setup.ts` - 統合テスト用セットアップ
- `setup-unit.ts` - ユニットテスト用セットアップ