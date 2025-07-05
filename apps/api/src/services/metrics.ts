import prisma from '@/config/database';

export class MetricsService {
  static async getMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      activeSessions,
      totalTasks,
      totalTaskLists,
      activeShares,
    ] = await Promise.all([
      prisma.user.count(),
      
      prisma.user.count({
        where: {
          refreshTokens: {
            some: {
              updatedAt: {
                gte: oneHourAgo,
              },
              isActive: true,
            },
          },
        },
      }),
      
      prisma.collaborativeSession.count({
        where: {
          isActive: true,
          lastActivity: {
            gte: oneHourAgo,
          },
        },
      }),
      
      prisma.task.count(),
      
      prisma.taskList.count(),
      
      prisma.taskListShare.count({
        where: {
          isActive: true,
        },
      }),
    ]);

    const uptimeMs = process.uptime() * 1000;
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      totalUsers,
      activeUsers,
      activeSessions,
      totalTasks,
      totalTaskLists,
      activeShares,
      uptime: `${uptimeHours}h ${uptimeMinutes}m`,
      timestamp: now.toISOString(),
    };
  }

  static async getDetailedMetrics() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      basicMetrics,
      completedTasksToday,
      newUsersToday,
      activeDocuments,
    ] = await Promise.all([
      this.getMetrics(),
      
      prisma.task.count({
        where: {
          completed: true,
          updatedAt: {
            gte: oneDayAgo,
          },
        },
      }),
      
      prisma.user.count({
        where: {
          createdAt: {
            gte: oneDayAgo,
          },
        },
      }),
      
      prisma.taskListDocument.count({
        where: {
          activeSessionCount: {
            gt: 0,
          },
        },
      }),
    ]);

    return {
      ...basicMetrics,
      completedTasksToday,
      newUsersToday,
      activeDocuments,
    };
  }
}