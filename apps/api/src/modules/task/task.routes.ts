import { Router } from 'express';
import { TaskController } from './task.controller';
import { authenticate } from '@/shared/middleware/auth';
import { validateBody } from '@/shared/middleware/validation';
import {
  taskCreateSchema,
  taskUpdateSchema,
} from '@/shared/utils/validation';

const router = Router();

// Task operations on specific task lists
router.get('/list/:taskListId', authenticate, TaskController.getTaskListTasks);
router.post('/list/:taskListId', authenticate, validateBody(taskCreateSchema), TaskController.createTask);
router.put('/list/:taskListId/order', authenticate, TaskController.updateTaskOrder);

// Individual task operations
router.get('/:taskId', authenticate, TaskController.getTask);
router.put('/:taskId', authenticate, validateBody(taskUpdateSchema), TaskController.updateTask);
router.delete('/:taskId', authenticate, TaskController.deleteTask);

export default router;