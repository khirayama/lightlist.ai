import { Router } from 'express';
import { ShareController } from '@/controllers/share';
import { authenticate } from '@/middleware/auth';

const router = Router();

// Create and delete shares (authenticated)
router.post('/:taskListId', authenticate, ShareController.createShare);
router.delete('/:taskListId', authenticate, ShareController.deleteShare);

// Public access to shared content
router.get('/:shareToken', ShareController.getSharedTaskList);
router.post('/:shareToken/copy', authenticate, ShareController.copySharedTaskList);

export default router;