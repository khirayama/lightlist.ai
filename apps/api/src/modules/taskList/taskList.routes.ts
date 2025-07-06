import { Router } from 'express';
import { TaskListController } from './taskList.controller';
import { authenticate } from '@/shared/middleware/auth';
import { validateBody } from '@/shared/middleware/validation';
import {
  taskListCreateSchema,
  taskListUpdateSchema,
} from '@/shared/utils/validation';

const router = Router();

router.get('/', authenticate, TaskListController.getUserTaskLists);
router.post('/', authenticate, validateBody(taskListCreateSchema), TaskListController.createTaskList);
router.put('/order', authenticate, TaskListController.updateTaskListOrder);

router.get('/:taskListId', authenticate, TaskListController.getTaskList);
router.put('/:taskListId', authenticate, validateBody(taskListUpdateSchema), TaskListController.updateTaskList);
router.delete('/:taskListId', authenticate, TaskListController.deleteTaskList);

export default router;