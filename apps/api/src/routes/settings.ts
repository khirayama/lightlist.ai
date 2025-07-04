import { Router } from 'express';
import { SettingsController } from '@/controllers/settings';
import { authenticate } from '@/middleware/auth';
import { validateBody } from '@/middleware/validation';
import { settingsSchema } from '@/utils/validation';

const router = Router();

router.get('/', authenticate, SettingsController.getSettings);
router.put('/', authenticate, validateBody(settingsSchema), SettingsController.updateSettings);

export default router;