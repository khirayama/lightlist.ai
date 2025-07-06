import { Router } from 'express';
import { SettingsController } from '../modules/settings/settings.controller';
import { authenticate } from '@/shared/middleware/auth';
import { validateBody } from '@/shared/middleware/validation';
import { appSchema, taskListOrderSchema } from '@/shared/utils/validation';

const router = Router();

router.get('/', authenticate, SettingsController.getApp);
router.put('/', authenticate, validateBody(appSchema), SettingsController.updateApp);
router.get('/taskListOrder', authenticate, SettingsController.getTaskListOrder);
router.put('/taskListOrder', authenticate, validateBody(taskListOrderSchema), SettingsController.updateTaskListOrder);

export default router;