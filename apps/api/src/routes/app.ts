import { Router } from 'express';
import { SettingsController } from '@/controllers/settings';
import { authenticate } from '@/middleware/auth';
import { validateBody } from '@/middleware/validation';
import { appSchema, taskListOrderSchema } from '@/utils/validation';

const router = Router();

router.get('/', authenticate, SettingsController.getApp);
router.put('/', authenticate, validateBody(appSchema), SettingsController.updateApp);
router.get('/taskListOrder', authenticate, SettingsController.getTaskListOrder);
router.put('/taskListOrder', authenticate, validateBody(taskListOrderSchema), SettingsController.updateTaskListOrder);

export default router;