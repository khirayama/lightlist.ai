import { Router } from 'express';
import { AuthController } from '@/controllers/auth';
import { validateBody } from '@/middleware/validation';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '@/utils/validation';

const router = Router();

router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);
router.post('/refresh', validateBody(refreshTokenSchema), AuthController.refresh);
router.post('/logout', validateBody(refreshTokenSchema), AuthController.logout);

export default router;