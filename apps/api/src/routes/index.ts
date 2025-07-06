import { Router } from 'express';
import authRoutes from '@/modules/auth/auth.routes';
import settingsRoutes from '@/modules/settings/settings.routes';
import appRoutes from './app';
import collaborativeRoutes from '@/modules/collaborative/collaborative.routes';
import taskListRoutes from '@/modules/taskList/taskList.routes';
import taskRoutes from '@/modules/task/task.routes';
import shareRoutes from '@/modules/share/share.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/settings', settingsRoutes);
router.use('/app', appRoutes);
router.use('/collaborative', collaborativeRoutes);
router.use('/tasklists', taskListRoutes);
router.use('/tasks', taskRoutes);
router.use('/share', shareRoutes);

export default router;