import { Router } from 'express';
import { CollaborativeController } from './collaborative.controller';
import { authenticate } from '@/shared/middleware/auth';
import { validateBody } from '@/shared/middleware/validation';
import {
  collaborativeSessionSchema,
  updateSchema,
} from '@/shared/utils/validation';

const router = Router();

router.post(
  '/sessions/:taskListId',
  authenticate,
  validateBody(collaborativeSessionSchema),
  CollaborativeController.startSession
);

router.get(
  '/sessions/:taskListId',
  authenticate,
  CollaborativeController.getState
);

router.put(
  '/sessions/:taskListId',
  authenticate,
  validateBody(updateSchema),
  CollaborativeController.applyUpdate
);

router.patch(
  '/sessions/:taskListId',
  authenticate,
  CollaborativeController.keepAlive
);

router.delete(
  '/sessions/:taskListId',
  authenticate,
  CollaborativeController.endSession
);

export default router;