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

// TaskList management endpoints for collaborative operations
router.get(
  '/taskLists/:taskListId',
  authenticate,
  CollaborativeController.getTaskList
);

router.post(
  '/taskLists',
  authenticate,
  CollaborativeController.createTaskList
);

router.put(
  '/taskLists/:taskListId',
  authenticate,
  CollaborativeController.updateTaskList
);

router.delete(
  '/taskLists/:taskListId',
  authenticate,
  CollaborativeController.deleteTaskList
);

export default router;