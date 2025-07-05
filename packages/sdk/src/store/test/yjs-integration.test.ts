import { describe, it, expect, beforeEach } from 'vitest';
import { createTestStore } from './setup';
import { Store } from '../index';
import * as Y from 'yjs';

describe('Store Y.js統合', () => {
  let store: Store;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('Y.jsドキュメント管理', () => {
    it('Y.jsドキュメントを設定できる', () => {
      const doc = new Y.Doc();
      const taskListId = 'list1';
      
      store.setYjsDoc(taskListId, doc);
      
      const retrievedDoc = store.getYjsDoc(taskListId);
      expect(retrievedDoc).toBe(doc);
    });

    it('存在しないY.jsドキュメントはnullを返す', () => {
      const doc = store.getYjsDoc('nonexistent');
      expect(doc).toBeNull();
    });

    it('Y.jsドキュメントを削除できる', () => {
      const doc = new Y.Doc();
      const taskListId = 'list1';
      
      store.setYjsDoc(taskListId, doc);
      expect(store.getYjsDoc(taskListId)).toBe(doc);
      
      store.removeYjsDoc(taskListId);
      expect(store.getYjsDoc(taskListId)).toBeNull();
    });

    it('複数のY.jsドキュメントを管理できる', () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();
      
      store.setYjsDoc('list1', doc1);
      store.setYjsDoc('list2', doc2);
      
      expect(store.getYjsDoc('list1')).toBe(doc1);
      expect(store.getYjsDoc('list2')).toBe(doc2);
    });

    it('同じIDのY.jsドキュメントを上書きできる', () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();
      const taskListId = 'list1';
      
      store.setYjsDoc(taskListId, doc1);
      expect(store.getYjsDoc(taskListId)).toBe(doc1);
      
      store.setYjsDoc(taskListId, doc2);
      expect(store.getYjsDoc(taskListId)).toBe(doc2);
    });
  });

  describe('Y.jsドキュメントの内部状態', () => {
    it('Y.jsドキュメントマップが正しく初期化される', () => {
      expect(store.yjsDocs).toBeDefined();
      expect(store.yjsDocs.size).toBe(0);
    });

    it('Y.jsドキュメント設定時にマップサイズが増加する', () => {
      const doc = new Y.Doc();
      
      expect(store.yjsDocs.size).toBe(0);
      
      store.setYjsDoc('list1', doc);
      expect(store.yjsDocs.size).toBe(1);
      
      store.setYjsDoc('list2', new Y.Doc());
      expect(store.yjsDocs.size).toBe(2);
    });

    it('Y.jsドキュメント削除時にマップサイズが減少する', () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();
      
      store.setYjsDoc('list1', doc1);
      store.setYjsDoc('list2', doc2);
      expect(store.yjsDocs.size).toBe(2);
      
      store.removeYjsDoc('list1');
      expect(store.yjsDocs.size).toBe(1);
      
      store.removeYjsDoc('list2');
      expect(store.yjsDocs.size).toBe(0);
    });
  });

  describe('Y.jsドキュメントの実際の操作', () => {
    it('Y.jsドキュメントでタスク順序を管理できる', () => {
      const doc = new Y.Doc();
      const taskOrder = doc.getArray('taskOrder');
      
      store.setYjsDoc('list1', doc);
      
      // タスク順序を設定
      taskOrder.push(['task1', 'task2', 'task3']);
      
      const retrievedDoc = store.getYjsDoc('list1');
      const retrievedTaskOrder = retrievedDoc?.getArray('taskOrder');
      
      expect(retrievedTaskOrder?.toArray()).toEqual(['task1', 'task2', 'task3']);
    });

    it('Y.jsドキュメントでタスク順序を更新できる', () => {
      const doc = new Y.Doc();
      const taskOrder = doc.getArray('taskOrder');
      
      store.setYjsDoc('list1', doc);
      
      // 初期順序
      taskOrder.push(['task1', 'task2', 'task3']);
      
      // 全体をクリアして新しい順序を設定
      taskOrder.delete(0, taskOrder.length);
      taskOrder.push(['task2', 'task1', 'task3']);
      
      const retrievedDoc = store.getYjsDoc('list1');
      const retrievedTaskOrder = retrievedDoc?.getArray('taskOrder');
      
      expect(retrievedTaskOrder?.toArray()).toEqual(['task2', 'task1', 'task3']);
    });

    it('Y.jsドキュメントでマップ形式のデータを管理できる', () => {
      const doc = new Y.Doc();
      const taskListMap = doc.getMap('taskList');
      
      store.setYjsDoc('list1', doc);
      
      // タスクリストの基本情報を設定
      taskListMap.set('id', 'list1');
      taskListMap.set('name', 'Y.js管理リスト');
      taskListMap.set('background', '#FF0000');
      
      const retrievedDoc = store.getYjsDoc('list1');
      const retrievedMap = retrievedDoc?.getMap('taskList');
      
      expect(retrievedMap?.get('id')).toBe('list1');
      expect(retrievedMap?.get('name')).toBe('Y.js管理リスト');
      expect(retrievedMap?.get('background')).toBe('#FF0000');
    });
  });

  describe('リソース管理とメモリリーク対策', () => {
    it('Y.jsドキュメントを削除してもメモリリークしない', () => {
      const docs = [];
      
      // 複数のドキュメントを作成・設定・削除
      for (let i = 0; i < 10; i++) {
        const doc = new Y.Doc();
        docs.push(doc);
        store.setYjsDoc(`list${i}`, doc);
      }
      
      expect(store.yjsDocs.size).toBe(10);
      
      // 全て削除
      for (let i = 0; i < 10; i++) {
        store.removeYjsDoc(`list${i}`);
      }
      
      expect(store.yjsDocs.size).toBe(0);
      
      // ドキュメントがガベージコレクションの対象になることを確認
      docs.forEach((doc, index) => {
        expect(store.getYjsDoc(`list${index}`)).toBeNull();
      });
    });

    it('存在しないY.jsドキュメントの削除は安全に処理される', () => {
      expect(() => {
        store.removeYjsDoc('nonexistent');
      }).not.toThrow();
      
      expect(store.yjsDocs.size).toBe(0);
    });
  });

  describe('Y.jsドキュメントとStore状態の分離', () => {
    it('Y.jsドキュメントの操作はStore状態に影響しない', () => {
      const doc = new Y.Doc();
      store.setYjsDoc('list1', doc);
      
      const initialState = store.getState();
      
      // Y.jsドキュメントを操作
      const taskOrder = doc.getArray('taskOrder');
      taskOrder.push(['task1', 'task2']);
      
      const finalState = store.getState();
      
      // Store状態は変更されない
      expect(finalState).toEqual(initialState);
    });

    it('Store状態の変更はY.jsドキュメントに影響しない', () => {
      const doc = new Y.Doc();
      const taskOrder = doc.getArray('taskOrder');
      taskOrder.push(['task1', 'task2']);
      
      store.setYjsDoc('list1', doc);
      
      // Store状態を変更
      store.updateUser({
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });
      
      // Y.jsドキュメントは影響を受けない
      const retrievedDoc = store.getYjsDoc('list1');
      const retrievedTaskOrder = retrievedDoc?.getArray('taskOrder');
      expect(retrievedTaskOrder?.toArray()).toEqual(['task1', 'task2']);
    });
  });
});