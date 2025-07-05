import { Router } from 'express';
import authRoutes from './auth';
import settingsRoutes from './settings';
import appRoutes from './app';
import collaborativeRoutes from './collaborative';
import taskListRoutes from './taskList';
import taskRoutes from './task';
import shareRoutes from './share';

const router = Router();

router.use('/auth', authRoutes);
router.use('/settings', settingsRoutes);
router.use('/app', appRoutes);
router.use('/collaborative', collaborativeRoutes);
router.use('/tasklists', taskListRoutes);
router.use('/tasks', taskRoutes);
router.use('/share', shareRoutes);

export default router;