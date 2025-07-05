import { describe, it, expect } from 'vitest';

describe('セットアップテスト', () => {
  it('基本的な動作確認', () => {
    expect(1 + 1).toBe(2);
  });

  it('環境変数の確認', () => {
    expect(process.env.DATABASE_URL).toContain('localhost:5435');
  });
});