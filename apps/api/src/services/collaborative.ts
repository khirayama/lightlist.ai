import prisma from '@/config/database';
import { YjsService } from './yjs';
import {
  CollaborativeSessionResponse,
  StateResponse,
  UpdateResponse,
} from '@/types';

export class CollaborativeService {
  private static readonly ACTIVE_SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
  private static readonly BACKGROUND_SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  static async startSession(
    taskListId: string,
    userId: string,
    deviceId: string,
    sessionType: 'active' | 'background' = 'active'
  ): Promise<CollaborativeSessionResponse> {
    // 期限切れセッションのクリーンアップ
    await this.cleanupExpiredSessions();

    const app = await prisma.app.findUnique({
      where: { userId },
      select: { id: true, taskListOrder: true },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    // タスクリストの存在確認
    if (!app.taskListOrder.includes(taskListId)) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    const expiresAt = new Date();
    const timeoutMs =
      sessionType === 'active'
        ? this.ACTIVE_SESSION_TIMEOUT_MS
        : this.BACKGROUND_SESSION_TIMEOUT_MS;
    expiresAt.setTime(expiresAt.getTime() + timeoutMs);

    return await prisma.$transaction(async (tx: any) => {
      const existingSession = await tx.collaborativeSession.findUnique({
        where: {
          taskListId_appId_deviceId: {
            taskListId,
            appId: app.id,
            deviceId,
          },
        },
      });

      if (existingSession) {
        const updatedSession = await tx.collaborativeSession.update({
          where: { id: existingSession.id },
          data: {
            sessionType,
            lastActivity: new Date(),
            expiresAt,
            isActive: true,
          },
        });

        const documentState = await this.getOrCreateDocument(taskListId, tx);
        const doc = YjsService.decodeDocumentState(documentState);
        const stateVector = YjsService.encodeStateVector(doc);

        return {
          sessionId: updatedSession.id,
          documentState,
          stateVector,
          expiresAt: updatedSession.expiresAt.toISOString(),
        };
      }

      const newSession = await tx.collaborativeSession.create({
        data: {
          taskListId,
          appId: app.id,
          deviceId,
          sessionType,
          expiresAt,
        },
      });

      const documentState = await this.getOrCreateDocument(taskListId, tx);
      const doc = YjsService.decodeDocumentState(documentState);
      const stateVector = YjsService.encodeStateVector(doc);

      return {
        sessionId: newSession.id,
        documentState,
        stateVector,
        expiresAt: newSession.expiresAt.toISOString(),
      };
    });
  }

  static async getState(
    taskListId: string,
    userId: string,
    deviceId: string
  ): Promise<StateResponse> {
    const app = await prisma.app.findUnique({
      where: { userId },
      select: { id: true, taskListOrder: true },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    // タスクリストの存在確認
    if (!app.taskListOrder.includes(taskListId)) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    const session = await prisma.collaborativeSession.findUnique({
      where: {
        taskListId_appId_deviceId: {
          taskListId,
          appId: app.id,
          deviceId,
        },
      },
    });

    if (!session || !session.isActive) {
      throw new Error('SESSION_NOT_FOUND');
    }

    const document = await prisma.taskListDocument.findUnique({
      where: { taskListId },
    });

    if (!document) {
      await this.initializeDocument(taskListId);
      return this.getState(taskListId, userId, deviceId);
    }

    const doc = YjsService.decodeDocumentState(
      document.documentState.toString('base64')
    );
    const stateVector = YjsService.encodeStateVector(doc);
    const documentState = YjsService.encodeDocumentState(doc);

    return {
      documentState,
      stateVector,
      hasUpdates: true,
    };
  }

  static async applyUpdate(
    taskListId: string,
    userId: string,
    deviceId: string,
    updateBase64: string
  ): Promise<UpdateResponse> {
    const app = await prisma.app.findUnique({
      where: { userId },
      select: { id: true, taskListOrder: true },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    // タスクリストの存在確認
    if (!app.taskListOrder.includes(taskListId)) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    const session = await prisma.collaborativeSession.findUnique({
      where: {
        taskListId_appId_deviceId: {
          taskListId,
          appId: app.id,
          deviceId,
        },
      },
    });

    if (!session || !session.isActive) {
      throw new Error('SESSION_NOT_FOUND');
    }

    return await prisma.$transaction(async (tx: any) => {
      const document = await tx.taskListDocument.findUnique({
        where: { taskListId },
      });

      if (!document) {
        throw new Error('DOCUMENT_NOT_FOUND');
      }

      const currentDoc = YjsService.decodeDocumentState(
        document.documentState.toString('base64')
      );

      YjsService.applyUpdateFromBase64(currentDoc, updateBase64);

      if (!YjsService.validateDocument(currentDoc)) {
        throw new Error('INVALID_DOCUMENT_STATE');
      }

      const newDocumentState = YjsService.encodeDocumentState(currentDoc);
      const newStateVector = YjsService.encodeStateVector(currentDoc);

      await tx.taskListDocument.update({
        where: { taskListId },
        data: {
          documentState: Buffer.from(newDocumentState, 'base64'),
          stateVector: Buffer.from(newStateVector, 'base64'),
        },
      });

      await tx.collaborativeSession.update({
        where: { id: session.id },
        data: {
          lastActivity: new Date(),
        },
      });

      const taskOrder = YjsService.getTaskOrder(currentDoc);
      await tx.taskList.update({
        where: { id: taskListId },
        data: {
          taskOrder,
        },
      });

      return {
        success: true,
        stateVector: newStateVector,
      };
    });
  }

  static async keepAlive(
    taskListId: string,
    userId: string,
    deviceId: string
  ): Promise<void> {
    const app = await prisma.app.findUnique({
      where: { userId },
      select: { id: true, taskListOrder: true },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    // タスクリストの存在確認
    if (!app.taskListOrder.includes(taskListId)) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    const session = await prisma.collaborativeSession.findUnique({
      where: {
        taskListId_appId_deviceId: {
          taskListId,
          appId: app.id,
          deviceId,
        },
      },
    });

    if (!session || !session.isActive) {
      throw new Error('SESSION_NOT_FOUND');
    }

    await prisma.collaborativeSession.update({
      where: { id: session.id },
      data: {
        lastActivity: new Date(),
      },
    });
  }

  static async endSession(
    taskListId: string,
    userId: string,
    deviceId: string
  ): Promise<void> {
    const app = await prisma.app.findUnique({
      where: { userId },
      select: { id: true, taskListOrder: true },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    // タスクリストの存在確認（endSessionは削除操作なので、存在しなくても成功扱い）
    if (!app.taskListOrder.includes(taskListId)) {
      return; // セッション終了は冪等性を保つため、エラーにしない
    }

    await prisma.$transaction(async (tx: any) => {
      const session = await tx.collaborativeSession.findUnique({
        where: {
          taskListId_appId_deviceId: {
            taskListId,
            appId: app.id,
            deviceId,
          },
        },
      });

      if (!session) {
        return;
      }

      await tx.collaborativeSession.delete({
        where: { id: session.id },
      });

      const activeSessionCount = await tx.collaborativeSession.count({
        where: {
          taskListId,
          isActive: true,
        },
      });

      if (activeSessionCount === 0) {
        await tx.taskListDocument.delete({
          where: { taskListId },
        }).catch(() => {
          // Document might not exist, ignore error
        });
      } else {
        await tx.taskListDocument.update({
          where: { taskListId },
          data: {
            activeSessionCount,
          },
        });
      }
    });
  }

  static async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();

    await prisma.$transaction(async (tx: any) => {
      const expiredSessions = await tx.collaborativeSession.findMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isActive: false },
          ],
        },
        select: {
          id: true,
          taskListId: true,
        },
      });

      if (expiredSessions.length === 0) {
        return;
      }

      const sessionIds = expiredSessions.map((s: any) => s.id);
      const taskListIds = [
        ...new Set(expiredSessions.map((s: any) => s.taskListId)),
      ];

      await tx.collaborativeSession.deleteMany({
        where: {
          id: { in: sessionIds },
        },
      });

      for (const taskListId of taskListIds) {
        const activeSessionCount = await tx.collaborativeSession.count({
          where: {
            taskListId,
            isActive: true,
          },
        });

        if (activeSessionCount === 0) {
          await tx.taskListDocument.delete({
            where: { taskListId },
          }).catch(() => {
            // Document might not exist, ignore error
          });
        } else {
          await tx.taskListDocument.update({
            where: { taskListId },
            data: {
              activeSessionCount,
            },
          }).catch(() => {
            // Document might not exist, ignore error
          });
        }
      }
    });
  }

  private static async getOrCreateDocument(
    taskListId: string,
    tx: any
  ): Promise<string> {
    const existingDocument = await tx.taskListDocument.findUnique({
      where: { taskListId },
    });

    if (existingDocument) {
      await tx.taskListDocument.update({
        where: { taskListId },
        data: {
          activeSessionCount: {
            increment: 1,
          },
        },
      });

      return existingDocument.documentState.toString('base64');
    }

    const taskList = await tx.taskList.findUnique({
      where: { id: taskListId },
      select: { taskOrder: true },
    });

    if (!taskList) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    const doc = YjsService.initializeFromTaskOrder(taskList.taskOrder);
    const documentState = YjsService.encodeDocumentState(doc);
    const stateVector = YjsService.encodeStateVector(doc);

    await tx.taskListDocument.create({
      data: {
        taskListId,
        documentState: Buffer.from(documentState, 'base64'),
        stateVector: Buffer.from(stateVector, 'base64'),
        activeSessionCount: 1,
      },
    });

    return documentState;
  }

  private static async initializeDocument(taskListId: string): Promise<void> {
    const taskList = await prisma.taskList.findUnique({
      where: { id: taskListId },
      select: { taskOrder: true },
    });

    if (!taskList) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    const doc = YjsService.initializeFromTaskOrder(taskList.taskOrder);
    const documentState = YjsService.encodeDocumentState(doc);
    const stateVector = YjsService.encodeStateVector(doc);

    await prisma.taskListDocument.create({
      data: {
        taskListId,
        documentState: Buffer.from(documentState, 'base64'),
        stateVector: Buffer.from(stateVector, 'base64'),
        activeSessionCount: 0,
      },
    });
  }
}