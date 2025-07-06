import { describe, it, expect, beforeEach } from 'vitest';
import { createTestStore } from './setup';
import { Store } from '../index';
import { StoreState } from '../types';

describe('Store 基本実装', () => {
  let store: Store;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('初期状態', () => {
    it('初期状態でストアが作成される', () => {
      expect(store).toBeDefined();
      expect(store.state).toBeDefined();
    });

    it('初期状態が正しく設定される', () => {
      const state = store.getState();
      
      expect(state.user).toBeNull();
      expect(state.app).toBeNull();
      expect(state.settings).toBeNull();
      expect(state.taskLists).toEqual([]);
      expect(state.activeSessionIds).toEqual([]);
      expect(state.errors).toEqual([]);
    });

    it('SyncStatus が正しく初期化される', () => {
      const state = store.getState();
      
      expect(state.syncStatus.pending).toEqual([]);
      expect(state.syncStatus.syncing).toEqual([]);
      expect(state.syncStatus.failed).toEqual([]);
      expect(state.syncStatus.lastSync).toEqual({});
    });
  });

  describe('状態取得', () => {
    it('getState() が現在の状態を返す', () => {
      const state1 = store.getState();
      const state2 = store.getState();
      
      expect(state1).toEqual(state2); // 同じ内容を持つ
      expect(state1).not.toBe(state2); // 異なるオブジェクトを参照
    });

    it('状態はイミュータブルである', () => {
      const state = store.getState();
      
      // 直接変更を試みる
      expect(() => {
        (state as any).user = { id: 'test' };
      }).not.toThrow();

      // 元の状態が変わらないことを確認
      const newState = store.getState();
      expect(newState.user).toBeNull();
    });
  });

  describe('Y.js統合の基本', () => {
    it('Y.jsドキュメントマップが初期化される', () => {
      expect(store.yjsDocs).toBeDefined();
      expect(store.yjsDocs.size).toBe(0);
    });

    it('リスナーセットが初期化される', () => {
      expect(store.listeners).toBeDefined();
      expect(store.listeners.size).toBe(0);
    });
  });
});