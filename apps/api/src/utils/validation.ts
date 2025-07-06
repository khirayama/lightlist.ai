import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  deviceId: z.string().min(1, 'Device ID is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const settingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  language: z.string().optional(),
});

export const appSchema = z.object({
  taskInsertPosition: z.enum(['top', 'bottom']).optional(),
  autoSort: z.boolean().optional(),
});

export const taskListOrderSchema = z.object({
  order: z.array(z.string()).min(0, 'Order must be an array'),
});

export const collaborativeSessionSchema = z.object({
  sessionType: z.enum(['active', 'background']).optional().default('active'),
});

export const updateSchema = z.object({
  update: z.string().min(1, 'Update data is required'),
});

export const taskListCreateSchema = z.object({
  name: z.string().min(1, 'Task list name is required'),
  background: z.string().optional(),
});

export const taskListUpdateSchema = z.object({
  name: z.string().min(1, 'Task list name is required').optional(),
  background: z.string().optional(),
});

export const taskCreateSchema = z.object({
  text: z.string().min(1, 'Task text is required'),
  date: z.string().optional(),
});

export const taskUpdateSchema = z.object({
  text: z.string().min(1, 'Task text is required').optional(),
  completed: z.boolean().optional(),
  date: z.string().optional(),
});

export const validateRequest = <T>(schema: z.ZodSchema<T>, data: any): T => {
  return schema.parse(data);
};