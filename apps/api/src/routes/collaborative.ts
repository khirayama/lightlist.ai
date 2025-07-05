import { Router } from 'express';
import { CollaborativeController } from '@/controllers/collaborative';
import { authenticate } from '@/middleware/auth';
import { validateBody } from '@/middleware/validation';
import {
  collaborativeSessionSchema,
  updateSchema,
} from '@/utils/validation';

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