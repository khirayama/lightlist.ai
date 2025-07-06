import prisma from '@/config/database';
import { TaskCreateRequest, TaskUpdateRequest } from '@/shared/types';

export class TaskService {
  static async getUserTaskListTasks(taskListId: string, userId: string) {
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

    const tasks = await prisma.task.findMany({
      where: { taskListId },
      orderBy: [
        { completed: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return tasks;
  }

  static async getTask(taskId: string, userId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        taskList: true,
      },
    });

    if (!task) {
      throw new Error('TASK_NOT_FOUND');
    }

    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        taskListOrder: true,
      },
    });

    if (!app || !app.taskListOrder.includes(task.taskListId)) {
      throw new Error('TASK_NOT_FOUND');
    }

    return task;
  }

  static async createTask(
    taskListId: string,
    userId: string,
    data: TaskCreateRequest
  ) {
    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        taskListOrder: true,
        taskInsertPosition: true,
      },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!app.taskListOrder.includes(taskListId)) {
      throw new Error('TASK_LIST_NOT_FOUND');
    }

    return await prisma.$transaction(async (tx: any) => {
      const task = await tx.task.create({
        data: {
          text: data.text,
          date: data.date,
          taskListId,
        },
      });

      const taskList = await tx.taskList.findUnique({
        where: { id: taskListId },
        select: { taskOrder: true },
      });

      if (taskList) {
        let newTaskOrder: string[];
        
        if (app.taskInsertPosition === 'top') {
          newTaskOrder = [task.id, ...taskList.taskOrder];
        } else {
          newTaskOrder = [...taskList.taskOrder, task.id];
        }

        await tx.taskList.update({
          where: { id: taskListId },
          data: { taskOrder: newTaskOrder },
        });
      }

      return task;
    });
  }

  static async updateTask(taskId: string, userId: string, data: TaskUpdateRequest) {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        taskList: true,
      },
    });

    if (!existingTask) {
      throw new Error('TASK_NOT_FOUND');
    }

    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        taskListOrder: true,
      },
    });

    if (!app || !app.taskListOrder.includes(existingTask.taskListId)) {
      throw new Error('TASK_NOT_FOUND');
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        text: data.text,
        completed: data.completed,
        date: data.date,
      },
    });

    return task;
  }

  static async deleteTask(taskId: string, userId: string) {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        taskList: true,
      },
    });

    if (!existingTask) {
      throw new Error('TASK_NOT_FOUND');
    }

    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        taskListOrder: true,
      },
    });

    if (!app || !app.taskListOrder.includes(existingTask.taskListId)) {
      throw new Error('TASK_NOT_FOUND');
    }

    return await prisma.$transaction(async (tx: any) => {
      await tx.task.delete({
        where: { id: taskId },
      });

      const taskList = await tx.taskList.findUnique({
        where: { id: existingTask.taskListId },
        select: { taskOrder: true },
      });

      if (taskList) {
        const newTaskOrder = taskList.taskOrder.filter((id: string) => id !== taskId);
        await tx.taskList.update({
          where: { id: existingTask.taskListId },
          data: { taskOrder: newTaskOrder },
        });
      }

      return { success: true };
    });
  }

  static async updateTaskOrder(
    taskListId: string,
    userId: string,
    taskOrder: string[]
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

    const existingTasks = await prisma.task.findMany({
      where: {
        taskListId,
        id: {
          in: taskOrder,
        },
      },
      select: { id: true },
    });

    const existingIds = existingTasks.map((task) => task.id);
    const validTaskOrder = taskOrder.filter((id) => existingIds.includes(id));

    await prisma.taskList.update({
      where: { id: taskListId },
      data: {
        taskOrder: validTaskOrder,
      },
    });

    return validTaskOrder;
  }
}