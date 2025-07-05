import { describe, it, expect, beforeEach } from 'vitest';
import { createTestStore } from './setup';
import { Store } from '../index';
import { createSelectors } from '../selectors';
import { AppError } from '../../types';

describe('Store エラーハンドリング', () => {
  let store: Store;
  let selectors: ReturnType<typeof createSelectors>;

  beforeEach(() => {
    store = createTestStore();
    selectors = createSelectors(store);
  });

  describe('エラーの追加', () => {
    it('ネットワークエラーを追加できる', () => {
      const error: AppError = {
        type: 'network',
        code: 'NETWORK_ERROR',
        message: 'ネットワーク接続に失敗しました'
      };

      store.addError(error);

      const state = store.getState();
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0]).toEqual(error);
    });

    it('バリデーションエラーを追加できる', () => {
      const error: AppError = {
        type: 'validation',
        code: 'VALIDATION_ERROR',
        message: '入力値が無効です',
        details: { field: 'email', value: 'invalid-email' }
      };

      store.addError(error);

      const state = store.getState();
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0]).toEqual(error);
    });

    it('認証エラーを追加できる', () => {
      const error: AppError = {
        type: 'auth',
        code: 'UNAUTHORIZED',
        message: '認証が必要です'
      };

      store.addError(error);

      const state = store.getState();
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0]).toEqual(error);
    });

    it('複数のエラーを追加できる', () => {
      const error1: AppError = {
        type: 'network',
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー'
      };

      const error2: AppError = {
        type: 'validation',
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー'
      };

      store.addError(error1);
      store.addError(error2);

      const state = store.getState();
      expect(state.errors).toHaveLength(2);
      expect(state.errors).toEqual([error1, error2]);
    });
  });

  describe('エラーの削除', () => {
    beforeEach(() => {
      const error1: AppError = {
        type: 'network',
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー'
      };

      const error2: AppError = {
        type: 'validation',
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー'
      };

      const error3: AppError = {
        type: 'auth',
        code: 'UNAUTHORIZED',
        message: '認証エラー'
      };

      store.addError(error1);
      store.addError(error2);
      store.addError(error3);
    });

    it('特定のエラーを削除できる', () => {
      store.removeError('VALIDATION_ERROR');

      const state = store.getState();
      expect(state.errors).toHaveLength(2);
      expect(state.errors.some(error => error.code === 'VALIDATION_ERROR')).toBe(false);
    });

    it('存在しないエラーを削除しても安全', () => {
      const initialState = store.getState();
      
      store.removeError('NONEXISTENT_ERROR');

      const finalState = store.getState();
      expect(finalState.errors).toEqual(initialState.errors);
    });

    it('全てのエラーをクリアできる', () => {
      store.clearErrors();

      const state = store.getState();
      expect(state.errors).toEqual([]);
    });

    it('空の状態でエラーをクリアしても安全', () => {
      store.clearErrors();
      store.clearErrors(); // 2回実行

      const state = store.getState();
      expect(state.errors).toEqual([]);
    });
  });

  describe('エラー状態と同期機能の連携', () => {
    it('同期失敗時にエラーが自動的に追加される', () => {
      const syncError: AppError = {
        type: 'network',
        code: 'SYNC_FAILED',
        message: '同期に失敗しました'
      };

      store.setSyncStatus('list1', 'failed', syncError);

      const state = store.getState();
      expect(state.syncStatus.failed).toContain('list1');
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0]).toEqual(syncError);
    });

    it('同期成功時にはエラーは追加されない', () => {
      store.setSyncStatus('list1', 'syncing');

      const state = store.getState();
      expect(state.syncStatus.syncing).toContain('list1');
      expect(state.errors).toHaveLength(0);
    });

    it('複数のタスクリストで同期エラーが発生した場合', () => {
      const error1: AppError = {
        type: 'network',
        code: 'SYNC_FAILED_LIST1',
        message: 'リスト1の同期に失敗'
      };

      const error2: AppError = {
        type: 'network',
        code: 'SYNC_FAILED_LIST2',
        message: 'リスト2の同期に失敗'
      };

      store.setSyncStatus('list1', 'failed', error1);
      store.setSyncStatus('list2', 'failed', error2);

      const state = store.getState();
      expect(state.syncStatus.failed).toEqual(['list1', 'list2']);
      expect(state.errors).toHaveLength(2);
    });
  });

  describe('エラーの分類と検索', () => {
    beforeEach(() => {
      const networkError1: AppError = {
        type: 'network',
        code: 'NETWORK_ERROR_1',
        message: 'ネットワークエラー1'
      };

      const networkError2: AppError = {
        type: 'network',
        code: 'NETWORK_ERROR_2',
        message: 'ネットワークエラー2'
      };

      const validationError: AppError = {
        type: 'validation',
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー'
      };

      const authError: AppError = {
        type: 'auth',
        code: 'AUTH_ERROR',
        message: '認証エラー'
      };

      store.addError(networkError1);
      store.addError(networkError2);
      store.addError(validationError);
      store.addError(authError);
    });

    it('ネットワークエラーのみを取得できる', () => {
      const state = store.getState();
      const networkErrors = selectors.getErrorsByType(state, 'network');

      expect(networkErrors).toHaveLength(2);
      expect(networkErrors.every(error => error.type === 'network')).toBe(true);
    });

    it('バリデーションエラーのみを取得できる', () => {
      const state = store.getState();
      const validationErrors = selectors.getErrorsByType(state, 'validation');

      expect(validationErrors).toHaveLength(1);
      expect(validationErrors[0].type).toBe('validation');
    });

    it('認証エラーのみを取得できる', () => {
      const state = store.getState();
      const authErrors = selectors.getErrorsByType(state, 'auth');

      expect(authErrors).toHaveLength(1);
      expect(authErrors[0].type).toBe('auth');
    });

    it('存在しないタイプのエラーは空配列を返す', () => {
      const state = store.getState();
      const unknownErrors = selectors.getErrorsByType(state, 'unknown');

      expect(unknownErrors).toEqual([]);
    });

    it('エラーの有無を正しく判定できる', () => {
      const state = store.getState();
      expect(selectors.hasErrors(state)).toBe(true);

      store.clearErrors();
      const newState = store.getState();
      expect(selectors.hasErrors(newState)).toBe(false);
    });
  });

  describe('エラーの詳細情報', () => {
    it('詳細情報付きのエラーを正しく管理できる', () => {
      const errorWithDetails: AppError = {
        type: 'validation',
        code: 'FIELD_VALIDATION_ERROR',
        message: 'フィールドの検証に失敗しました',
        details: {
          field: 'email',
          value: 'invalid-email',
          expectedFormat: 'user@domain.com'
        }
      };

      store.addError(errorWithDetails);

      const state = store.getState();
      expect(state.errors[0].details).toEqual({
        field: 'email',
        value: 'invalid-email',
        expectedFormat: 'user@domain.com'
      });
    });

    it('詳細情報なしのエラーも正しく管理できる', () => {
      const simpleError: AppError = {
        type: 'network',
        code: 'SIMPLE_ERROR',
        message: 'シンプルなエラー'
      };

      store.addError(simpleError);

      const state = store.getState();
      expect(state.errors[0].details).toBeUndefined();
    });
  });

  describe('エラーハンドリングのパフォーマンス', () => {
    it('大量のエラーを効率的に処理できる', () => {
      const startTime = Date.now();

      // 1000個のエラーを追加
      for (let i = 0; i < 1000; i++) {
        const error: AppError = {
          type: 'network',
          code: `ERROR_${i}`,
          message: `エラー ${i}`
        };
        store.addError(error);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const state = store.getState();
      expect(state.errors).toHaveLength(1000);
      
      // パフォーマンステスト（1秒以下で完了することを期待）
      expect(duration).toBeLessThan(1000);
    });

    it('大量のエラー削除を効率的に処理できる', () => {
      // 100個のエラーを追加
      for (let i = 0; i < 100; i++) {
        const error: AppError = {
          type: 'network',
          code: `ERROR_${i}`,
          message: `エラー ${i}`
        };
        store.addError(error);
      }

      const startTime = Date.now();

      // 全てのエラーをクリア
      store.clearErrors();

      const endTime = Date.now();
      const duration = endTime - startTime;

      const state = store.getState();
      expect(state.errors).toEqual([]);
      
      // パフォーマンステスト（100ms以下で完了することを期待）
      expect(duration).toBeLessThan(100);
    });
  });
});