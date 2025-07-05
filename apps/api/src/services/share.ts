import prisma from '@/config/database';
import { nanoid } from 'nanoid';
import { ShareResponse, SharedTaskListResponse } from '@/types';

export class ShareService {
  static async createShare(
    taskListId: string,
    userId: string
  ): Promise<ShareResponse> {
    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        taskListOrder: true,
      },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!app.taskListOrder.includes(taskListId)) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    const existingShare = await prisma.taskListShare.findUnique({
      where: { taskListId },
    });

    if (existingShare && existingShare.isActive) {
      return {
        shareToken: existingShare.shareToken,
        shareUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/share/${existingShare.shareToken}`,
      };
    }

    const shareToken = nanoid(16);

    const share = await prisma.taskListShare.upsert({
      where: { taskListId },
      create: {
        taskListId,
        shareToken,
        isActive: true,
      },
      update: {
        shareToken,
        isActive: true,
      },
    });

    return {
      shareToken: share.shareToken,
      shareUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/share/${share.shareToken}`,
    };
  }

  static async deleteShare(taskListId: string, userId: string): Promise<void> {
    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        taskListOrder: true,
      },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!app.taskListOrder.includes(taskListId)) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    await prisma.taskListShare.updateMany({
      where: { taskListId },
      data: { isActive: false },
    });
  }

  static async getSharedTaskList(
    shareToken: string
  ): Promise<SharedTaskListResponse> {
    const share = await prisma.taskListShare.findUnique({
      where: { shareToken },
      include: {
        taskList: {
          include: {
            tasks: {
              orderBy: [
                { completed: 'asc' },
                { createdAt: 'asc' },
              ],
            },
          },
        },
      },
    });

    if (!share || !share.isActive) {
      throw new Error('SHARE_NOT_FOUND');
    }

    return {
      taskList: {
        id: share.taskList.id,
        name: share.taskList.name,
        background: share.taskList.background || '',
        tasks: share.taskList.tasks.map((task) => ({
          id: task.id,
          text: task.text,
          completed: task.completed,
          date: task.date || undefined,
        })),
      },
      isReadOnly: true,
    };
  }

  static async copySharedTaskList(
    shareToken: string,
    userId: string
  ): Promise<{ taskList: any }> {
    const sharedData = await this.getSharedTaskList(shareToken);

    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        id: true,
        taskListOrder: true,
      },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    return await prisma.$transaction(async (tx: any) => {
      const newTaskList = await tx.taskList.create({
        data: {
          name: `${sharedData.taskList.name} (Copy)`,
          background: sharedData.taskList.background,
        },
      });

      const taskMap = new Map<string, string>();
      const tasks = [];

      for (const task of sharedData.taskList.tasks) {
        const newTask = await tx.task.create({
          data: {
            text: task.text,
            completed: task.completed,
            date: task.date,
            taskListId: newTaskList.id,
          },
        });
        taskMap.set(task.id, newTask.id);
        tasks.push(newTask);
      }

      const newTaskOrder = sharedData.taskList.tasks.map((task) =>
        taskMap.get(task.id)!
      );

      await tx.taskList.update({
        where: { id: newTaskList.id },
        data: { taskOrder: newTaskOrder },
      });

      const updatedTaskListOrder = [newTaskList.id, ...app.taskListOrder];
      await tx.app.update({
        where: { id: app.id },
        data: { taskListOrder: updatedTaskListOrder },
      });

      return {
        taskList: {
          ...newTaskList,
          tasks,
        },
      };
    });
  }
}