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

export const settingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  language: z.string().optional(),
});

export const appSchema = z.object({
  taskInsertPosition: z.enum(['top', 'bottom']).optional(),
  autoSort: z.boolean().optional(),
});

export const validateRequest = <T>(schema: z.ZodSchema<T>, data: any): T => {
  return schema.parse(data);
};