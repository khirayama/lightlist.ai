import { Router } from 'express';
import authRoutes from './auth';
import settingsRoutes from './settings';
import appRoutes from './app';

const router = Router();

router.use('/auth', authRoutes);
router.use('/settings', settingsRoutes);
router.use('/app', appRoutes);

export default router;