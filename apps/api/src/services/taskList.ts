import prisma from '@/config/database';
import { TaskListCreateRequest, TaskListUpdateRequest } from '@/types';

export class TaskListService {
  static async getUserTaskLists(userId: string) {
    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        taskListOrder: true,
      },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    const taskLists = await prisma.taskList.findMany({
      where: {
        id: {
          in: app.taskListOrder,
        },
      },
      include: {
        tasks: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    const orderedTaskLists = app.taskListOrder
      .map((id) => taskLists.find((tl) => tl.id === id))
      .filter(Boolean);

    return orderedTaskLists;
  }

  static async getTaskList(taskListId: string, userId: string) {
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

    const taskList = await prisma.taskList.findUnique({
      where: { id: taskListId },
      include: {
        tasks: {
          orderBy: [
            { completed: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!taskList) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    return taskList;
  }

  static async createTaskList(userId: string, data: TaskListCreateRequest) {
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
      const taskList = await tx.taskList.create({
        data: {
          name: data.name,
          background: data.background || '',
        },
      });

      const newTaskListOrder = [taskList.id, ...app.taskListOrder];
      await tx.app.update({
        where: { id: app.id },
        data: {
          taskListOrder: newTaskListOrder,
        },
      });

      return taskList;
    });
  }

  static async updateTaskList(
    taskListId: string,
    userId: string,
    data: TaskListUpdateRequest
  ) {
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

    const taskList = await prisma.taskList.update({
      where: { id: taskListId },
      data: {
        name: data.name,
        background: data.background,
      },
    });

    return taskList;
  }

  static async deleteTaskList(taskListId: string, userId: string) {
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

    if (!app.taskListOrder.includes(taskListId)) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    return await prisma.$transaction(async (tx: any) => {
      await tx.collaborativeSession.deleteMany({
        where: { taskListId },
      });

      await tx.taskListDocument.delete({
        where: { taskListId },
      }).catch(() => {
        // Document might not exist, ignore error
      });

      await tx.taskListShare.delete({
        where: { taskListId },
      }).catch(() => {
        // Share might not exist, ignore error
      });

      await tx.taskList.delete({
        where: { id: taskListId },
      });

      const newTaskListOrder = app.taskListOrder.filter(
        (id) => id !== taskListId
      );
      await tx.app.update({
        where: { id: app.id },
        data: {
          taskListOrder: newTaskListOrder,
        },
      });

      return { success: true };
    });
  }

  static async updateTaskListOrder(userId: string, taskListOrder: string[]) {
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

    const existingTaskLists = await prisma.taskList.findMany({
      where: {
        id: {
          in: taskListOrder,
        },
      },
      select: { id: true },
    });

    const existingIds = existingTaskLists.map((tl) => tl.id);
    const validTaskListOrder = taskListOrder.filter((id) =>
      existingIds.includes(id)
    );

    await prisma.app.update({
      where: { id: app.id },
      data: {
        taskListOrder: validTaskListOrder,
      },
    });

    return validTaskListOrder;
  }
}