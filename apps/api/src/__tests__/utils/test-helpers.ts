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

// Test data generators with unique values
function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}-${generateUniqueId()}@example.com`;
}

function generateUniqueDeviceId(): string {
  // Generate a UUID for device ID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older Node.js versions
  const randomHex = () => Math.floor(Math.random() * 16).toString(16);
  const segments = [
    Array(8).fill(0).map(() => randomHex()).join(''),
    Array(4).fill(0).map(() => randomHex()).join(''),
    Array(4).fill(0).map(() => randomHex()).join(''),
    Array(4).fill(0).map(() => randomHex()).join(''),
    Array(12).fill(0).map(() => randomHex()).join('')
  ];
  return segments.join('-');
}


// Dynamic test data generators for unique values
export function generateUniqueUserData(overrides: Partial<{email: string, password: string, deviceId: string}> = {}) {
  return {
    email: overrides.email || generateUniqueEmail(),
    password: overrides.password || 'TestPass123',
    deviceId: overrides.deviceId || generateUniqueDeviceId(),
  };
}

// Database helpers
export async function createTestUser(userData?: {email: string, password: string, deviceId: string}): Promise<User> {
  // userDataが渡されなかった場合のみ一意なデータを生成
  const userToCreate = userData || generateUniqueUserData();
  const hashedPassword = await hashPassword(userToCreate.password);
  const client = getTestPrisma(); // 確実に初期化されたPrismaクライアントを使用
  
  const user = await client.user.create({
    data: {
      email: userToCreate.email,
      password: hashedPassword,
    },
  });

  // Create default App and Settings
  await client.app.create({
    data: {
      userId: user.id,
      taskListOrder: [],
      taskInsertPosition: 'top',
      autoSort: false,
    },
  });

  await client.settings.create({
    data: {
      userId: user.id,
      theme: 'system',
      language: 'ja',
    },
  });

  return user;
}

export async function createAuthenticatedUser(userData?: Partial<{email: string, password: string, deviceId: string}>) {
  // ユーザーデータを生成し、createTestUserに渡す
  const uniqueUserData = generateUniqueUserData(userData);
  const user = await createTestUser(uniqueUserData);
  const tokens = generateTokenPair(user.id, user.email, uniqueUserData.deviceId);
  const client = getTestPrisma();
  
  // Save refresh token to database
  await client.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      deviceId: uniqueUserData.deviceId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  return {
    user,
    tokens,
    deviceId: uniqueUserData.deviceId,
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
  const client = getTestPrisma();

  for (let i = 0; i < count; i++) {
    const deviceId = generateUniqueDeviceId();
    const tokens = generateTokenPair(user.id, user.email, deviceId);
    
    await client.refreshToken.create({
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
  const client = getTestPrisma();
  const user = await client.user.findUnique({ where: { email } });
  if (user) {
    await client.$transaction([
      client.refreshToken.deleteMany({ where: { userId: user.id } }),
      client.settings.deleteMany({ where: { userId: user.id } }),
      client.app.deleteMany({ where: { userId: user.id } }),
      client.user.delete({ where: { id: user.id } }),
    ]);
  }
}