import * as Y from 'yjs';

/**
 * YjsドキュメントからBase64エンコードされた状態を生成
 */
export function encodeYjsState(doc: Y.Doc): string {
  const state = Y.encodeStateAsUpdate(doc);
  return Buffer.from(state).toString('base64');
}

/**
 * Base64エンコードされた状態からYjsドキュメントを復元
 */
export function decodeYjsState(encodedState: string): Y.Doc {
  const doc = new Y.Doc();
  const state = Buffer.from(encodedState, 'base64');
  Y.applyUpdate(doc, state);
  return doc;
}

/**
 * YjsドキュメントからBase64エンコードされた状態ベクターを生成
 */
export function encodeYjsStateVector(doc: Y.Doc): string {
  const stateVector = Y.encodeStateVector(doc);
  return Buffer.from(stateVector).toString('base64');
}

/**
 * Base64エンコードされた状態ベクターをデコード
 */
export function decodeYjsStateVector(encodedStateVector: string): Uint8Array {
  return Buffer.from(encodedStateVector, 'base64');
}

/**
 * 状態ベクターに基づいて差分更新を生成
 */
export function generateYjsUpdate(doc: Y.Doc, encodedStateVector: string): string | null {
  const stateVector = decodeYjsStateVector(encodedStateVector);
  const update = Y.encodeStateAsUpdate(doc, stateVector);
  
  if (process.env.NODE_ENV === 'test') {
    console.log(`[YJS DEBUG] generateYjsUpdate: update.length=${update.length}, base64=${Buffer.from(update).toString('base64')}`);
  }
  
  // 空の更新またはYjsの「差分なし」標準データかどうかを確認
  if (update.length === 0) {
    return null; // 明確に差分なし
  }
  
  // Yjsが同じ状態で返す標準的な「差分なし」データをチェック
  // Base64 "AAA=" は [0, 0] という2バイトのデータ
  if (update.length === 2 && update[0] === 0 && update[1] === 0) {
    if (process.env.NODE_ENV === 'test') {
      console.log('[YJS DEBUG] Detected "no diff" standard Yjs data, returning null');
    }
    return null; // 実質的な差分なし
  }
  
  return Buffer.from(update).toString('base64');
}

/**
 * Base64エンコードされた更新をYjsドキュメントに適用
 */
export function applyYjsUpdate(doc: Y.Doc, encodedUpdate: string): void {
  const update = Buffer.from(encodedUpdate, 'base64');
  Y.applyUpdate(doc, update);
}

/**
 * タスクリスト用の初期Yjsドキュメントを作成
 */
export function createInitialTaskListDoc(): Y.Doc {
  const doc = new Y.Doc();
  
  // タスクの配列（タスクの順序を管理）
  doc.getArray('tasks');
  
  // メタデータ（タスクリスト名、色など）
  const metadata = doc.getMap('metadata');
  
  // 初期メタデータを設定
  metadata.set('lastModified', Date.now());
  
  return doc;
}

/**
 * YjsドキュメントからタスクIDの配列を取得
 */
export function getTaskOrderFromDoc(doc: Y.Doc): string[] {
  const tasks = doc.getArray('tasks');
  return tasks.toArray()
    .map((taskMap: any) => (taskMap as Y.Map<any>).get('id'))
    .filter((id: any): id is string => typeof id === 'string');
}

/**
 * YjsドキュメントにタスクIDを追加
 */
export function addTaskToDoc(doc: Y.Doc, taskId: string, position: 'top' | 'bottom' = 'bottom'): void {
  const tasks = doc.getArray('tasks');
  const taskMap = new Y.Map();
  
  doc.transact(() => {
    taskMap.set('id', taskId);
    taskMap.set('createdAt', Date.now());
    
    if (position === 'top') {
      tasks.unshift([taskMap]);
    } else {
      tasks.push([taskMap]);
    }
    
    // メタデータを更新
    const metadata = doc.getMap('metadata');
    metadata.set('lastModified', Date.now());
  });
}

/**
 * YjsドキュメントからタスクIDを削除
 */
export function removeTaskFromDoc(doc: Y.Doc, taskId: string): boolean {
  const tasks = doc.getArray('tasks');
  const taskArray = tasks.toArray();
  
  let removed = false;
  doc.transact(() => {
    for (let i = 0; i < taskArray.length; i++) {
      const taskMap = taskArray[i] as Y.Map<any>;
      if (taskMap.get('id') === taskId) {
        tasks.delete(i, 1);
        removed = true;
        break;
      }
    }
    
    if (removed) {
      // メタデータを更新
      const metadata = doc.getMap('metadata');
      metadata.set('lastModified', Date.now());
    }
  });
  
  return removed;
}

/**
 * YjsドキュメントでタスクIDの順序を変更
 */
export function reorderTaskInDoc(doc: Y.Doc, taskId: string, newIndex: number): boolean {
  const tasks = doc.getArray('tasks');
  const taskArray = tasks.toArray();
  
  let reordered = false;
  doc.transact(() => {
    // 現在の位置を見つける
    let currentIndex = -1;
    let taskMap: Y.Map<any> | null = null;
    
    for (let i = 0; i < taskArray.length; i++) {
      const currentTaskMap = taskArray[i] as Y.Map<any>;
      if (currentTaskMap.get('id') === taskId) {
        currentIndex = i;
        taskMap = currentTaskMap;
        break;
      }
    }
    
    if (currentIndex !== -1 && taskMap && currentIndex !== newIndex) {
      // 現在の位置から削除
      tasks.delete(currentIndex, 1);
      
      // 新しい位置に挿入
      const adjustedIndex = newIndex > currentIndex ? newIndex - 1 : newIndex;
      tasks.insert(adjustedIndex, [taskMap]);
      
      reordered = true;
    }
    
    if (reordered) {
      // メタデータを更新
      const metadata = doc.getMap('metadata');
      metadata.set('lastModified', Date.now());
    }
  });
  
  return reordered;
}