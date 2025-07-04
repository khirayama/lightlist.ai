import { Router } from 'express';
import { SettingsController } from '@/controllers/settings';
import { authenticate } from '@/middleware/auth';
import { validateBody } from '@/middleware/validation';
import { appSchema } from '@/utils/validation';

const router = Router();

router.get('/', authenticate, SettingsController.getApp);
router.put('/', authenticate, validateBody(appSchema), SettingsController.updateApp);
router.get('/taskListOrder', authenticate, SettingsController.getTaskListOrder);

export default router;