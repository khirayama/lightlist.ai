import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authenticate } from '@/shared/middleware/auth';
import { validateBody } from '@/shared/middleware/validation';
import { settingsSchema } from '@/shared/utils/validation';

const router = Router();

router.get('/', authenticate, SettingsController.getSettings);
router.put('/', authenticate, validateBody(settingsSchema), SettingsController.updateSettings);

export default router;