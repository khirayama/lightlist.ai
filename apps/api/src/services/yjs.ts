import * as Y from 'yjs';
import { encodeStateAsUpdate, applyUpdate, encodeStateVector } from 'yjs';
import * as base64 from 'base64-js';

export class YjsService {
  static createDocument(): Y.Doc {
    return new Y.Doc();
  }

  static initializeFromTaskOrder(taskOrder: string[]): Y.Doc {
    const doc = new Y.Doc();
    const yMap = doc.getMap('taskList');
    yMap.set('taskOrder', taskOrder);
    return doc;
  }

  static getTaskOrder(doc: Y.Doc): string[] {
    const yMap = doc.getMap('taskList');
    const taskOrder = yMap.get('taskOrder');
    
    if (Array.isArray(taskOrder)) {
      return taskOrder;
    }
    
    return [];
  }

  static updateTaskOrder(doc: Y.Doc, newTaskOrder: string[]): void {
    const yMap = doc.getMap('taskList');
    yMap.set('taskOrder', newTaskOrder);
  }

  static encodeDocumentState(doc: Y.Doc): string {
    const state = encodeStateAsUpdate(doc);
    return base64.fromByteArray(state);
  }

  static encodeStateVector(doc: Y.Doc): string {
    const stateVector = encodeStateVector(doc);
    return base64.fromByteArray(stateVector);
  }

  static applyUpdateFromBase64(doc: Y.Doc, updateBase64: string): void {
    const updateBytes = base64.toByteArray(updateBase64);
    applyUpdate(doc, updateBytes);
  }

  static createUpdateFromDoc(doc: Y.Doc): string {
    const update = encodeStateAsUpdate(doc);
    return base64.fromByteArray(update);
  }

  static decodeDocumentState(stateBase64: string): Y.Doc {
    const doc = new Y.Doc();
    const stateBytes = base64.toByteArray(stateBase64);
    applyUpdate(doc, stateBytes);
    return doc;
  }

  static mergeDocuments(doc1: Y.Doc, doc2: Y.Doc): Y.Doc {
    const mergedDoc = new Y.Doc();
    
    const update1 = encodeStateAsUpdate(doc1);
    const update2 = encodeStateAsUpdate(doc2);
    
    applyUpdate(mergedDoc, update1);
    applyUpdate(mergedDoc, update2);
    
    return mergedDoc;
  }

  static hasConflict(doc1: Y.Doc, doc2: Y.Doc): boolean {
    try {
      const mergedDoc = this.mergeDocuments(doc1, doc2);
      const taskOrder1 = this.getTaskOrder(doc1);
      const taskOrder2 = this.getTaskOrder(doc2);
      const mergedTaskOrder = this.getTaskOrder(mergedDoc);
      
      return !(
        JSON.stringify(taskOrder1) === JSON.stringify(mergedTaskOrder) ||
        JSON.stringify(taskOrder2) === JSON.stringify(mergedTaskOrder)
      );
    } catch (error) {
      return true;
    }
  }

  static validateDocument(doc: Y.Doc): boolean {
    try {
      const yMap = doc.getMap('taskList');
      const taskOrder = yMap.get('taskOrder');
      
      if (!Array.isArray(taskOrder)) {
        return false;
      }
      
      for (const item of taskOrder) {
        if (typeof item !== 'string') {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  static createDiffUpdate(oldDoc: Y.Doc, newDoc: Y.Doc): string | null {
    try {
      const oldState = encodeStateVector(oldDoc);
      const newUpdate = encodeStateAsUpdate(newDoc, oldState);
      
      if (newUpdate.length === 0) {
        return null;
      }
      
      return base64.fromByteArray(newUpdate);
    } catch (error) {
      return null;
    }
  }
}