import { Router } from 'express';
import { TaskController } from '@/controllers/task';
import { authenticate } from '@/middleware/auth';
import { validateBody } from '@/middleware/validation';
import {
  taskCreateSchema,
  taskUpdateSchema,
} from '@/utils/validation';

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