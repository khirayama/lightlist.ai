import { Router } from 'express';
import { TaskListController } from '@/controllers/taskList';
import { authenticate } from '@/middleware/auth';
import { validateBody } from '@/middleware/validation';
import {
  taskListCreateSchema,
  taskListUpdateSchema,
} from '@/utils/validation';

const router = Router();

router.get('/', authenticate, TaskListController.getUserTaskLists);
router.post('/', authenticate, validateBody(taskListCreateSchema), TaskListController.createTaskList);
router.put('/order', authenticate, TaskListController.updateTaskListOrder);

router.get('/:taskListId', authenticate, TaskListController.getTaskList);
router.put('/:taskListId', authenticate, validateBody(taskListUpdateSchema), TaskListController.updateTaskList);
router.delete('/:taskListId', authenticate, TaskListController.deleteTaskList);

export default router;