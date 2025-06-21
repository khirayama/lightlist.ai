import request from 'supertest';
import { PrismaClient, User } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from '../../routes/auth';
import { generateTokenPair } from '../../utils/jwt';
import { hashPassword } from '../../utils/password';
import { getTestPrismaClient } from '../setup';

let app: express.Application;
let prisma: PrismaClient;

export function getTestApp(): express.Application {
  if (!app) {
    app = express();
    prisma = getTestPrismaClient();

    // Middleware setup (same as main app but with relaxed rate limiting)
    app.use(helmet());
    app.use(cors());
    
    // More relaxed rate limiting for tests
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);
    
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Test health check
    app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'ok',
        environment: 'test',
        timestamp: new Date().toISOString(),
      });
    });

    // Auth routes
    app.use('/api/auth', authRoutes);

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
      });
    });

    // Error handler
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Test App Error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
      });
    });
  }

  return app;
}

export function getTestRequest() {
  return request(getTestApp());
}

export function getTestPrisma(): PrismaClient {
  const client = getTestPrismaClient();
  if (!client) {
    throw new Error('Database not available for testing. Docker may not be running.');
  }
  return client;
}

// Test data generators
export const testData = {
  users: {
    validUser1: {
      email: 'test1@example.com',
      password: 'TestPass123',
      deviceId: '550e8400-e29b-41d4-a716-446655440001',
    },
    validUser2: {
      email: 'test2@example.com',
      password: 'TestPass456',
      deviceId: '550e8400-e29b-41d4-a716-446655440002',
    },
    invalidEmail: {
      email: 'invalid-email',
      password: 'TestPass123',
      deviceId: '550e8400-e29b-41d4-a716-446655440001',
    },
    weakPassword: {
      email: 'test@example.com',
      password: 'weak',
      deviceId: '550e8400-e29b-41d4-a716-446655440001',
    },
    invalidDeviceId: {
      email: 'test@example.com',
      password: 'TestPass123',
      deviceId: 'invalid-device-id',
    },
  },
  
  deviceIds: {
    device1: '550e8400-e29b-41d4-a716-446655440001',
    device2: '550e8400-e29b-41d4-a716-446655440002',
    device3: '550e8400-e29b-41d4-a716-446655440003',
    device4: '550e8400-e29b-41d4-a716-446655440004',
    device5: '550e8400-e29b-41d4-a716-446655440005',
    device6: '550e8400-e29b-41d4-a716-446655440006', // This will exceed the limit
    randomString: 'abcd1234567890abcd1234567890abcd', // 32 char random string format
  },
};

// Database helpers
export async function createTestUser(userData = testData.users.validUser1): Promise<User> {
  const hashedPassword = await hashPassword(userData.password);
  
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
    },
  });

  // Create default App and Settings
  await prisma.app.create({
    data: {
      userId: user.id,
      taskListOrder: [],
      taskInsertPosition: 'top',
      autoSort: false,
    },
  });

  await prisma.settings.create({
    data: {
      userId: user.id,
      theme: 'system',
      language: 'ja',
    },
  });

  return user;
}

export async function createAuthenticatedUser(userData = testData.users.validUser1) {
  const user = await createTestUser(userData);
  const tokens = generateTokenPair(user.id, user.email, userData.deviceId);
  
  // Save refresh token to database
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      deviceId: userData.deviceId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  return {
    user,
    tokens,
    deviceId: userData.deviceId,
  };
}

export function generateAuthHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

// Helper to wait for async operations
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to generate multiple devices for testing device limits
export async function createMultipleDevicesForUser(user: User, count: number = 5) {
  const devices = [];
  const deviceIds = Object.values(testData.deviceIds).slice(0, count);

  for (let i = 0; i < count; i++) {
    const deviceId = deviceIds[i] || `test-device-${i}`;
    const tokens = generateTokenPair(user.id, user.email, deviceId);
    
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        deviceId,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    devices.push({
      deviceId,
      tokens,
    });
  }

  return devices;
}

// Cleanup helpers
export async function cleanupUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
      prisma.settings.deleteMany({ where: { userId: user.id } }),
      prisma.app.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);
  }
}