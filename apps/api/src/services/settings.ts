import prisma from '@/config/database';
import { SettingsUpdateRequest, AppUpdateRequest } from '@/types';

export class SettingsService {
  static async getSettings(userId: string) {
    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: {
        theme: true,
        language: true,
      },
    });

    if (!settings) {
      throw new Error('USER_NOT_FOUND');
    }

    return settings;
  }

  static async updateSettings(userId: string, data: SettingsUpdateRequest) {
    const settings = await prisma.settings.update({
      where: { userId },
      data,
      select: {
        theme: true,
        language: true,
      },
    });

    return settings;
  }

  static async getApp(userId: string) {
    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        id: true,
        taskInsertPosition: true,
        autoSort: true,
      },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    return app;
  }

  static async updateApp(userId: string, data: AppUpdateRequest) {
    const app = await prisma.app.update({
      where: { userId },
      data,
      select: {
        id: true,
        taskInsertPosition: true,
        autoSort: true,
      },
    });

    return app;
  }

  static async getTaskListOrder(userId: string) {
    const app = await prisma.app.findUnique({
      where: { userId },
      select: {
        taskListOrder: true,
      },
    });

    if (!app) {
      throw new Error('USER_NOT_FOUND');
    }

    return app.taskListOrder;
  }

  static async updateTaskListOrder(userId: string, taskListOrder: string[]) {
    const app = await prisma.app.update({
      where: { userId },
      data: {
        taskListOrder,
      },
      select: {
        taskListOrder: true,
      },
    });

    return app.taskListOrder;
  }
}