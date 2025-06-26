import 'dotenv/config';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import taskListsRoutes from './routes/task-lists';
import tasksRoutes from './routes/tasks';
import shareRoutes from './routes/share';
import collaborativeRoutes from './routes/collaborative';
import { disconnectDatabase } from './services/database';
import { 
  responseCache, 
  invalidateCache, 
  performanceMonitor, 
  compressionOptions 
} from './middleware/performance';

const app = express();

// Environment variables debug
console.log('DEBUG: DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DEBUG: PORT:', process.env.PORT);
console.log('DEBUG: NODE_ENV:', process.env.NODE_ENV);

const PORT = Number(process.env.PORT) || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  max: Number(process.env.API_RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(compression(compressionOptions));
app.use(performanceMonitor);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Hello endpoint for testing
app.get('/api/hello', (_req, res) => {
  res.status(200).json({
    message: 'Hello from Lightlist API!',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Users routes (with cache)
app.use('/api/users', responseCache(300000), usersRoutes);

// Task lists routes (with cache)
app.use('/api/task-lists', responseCache(300000), taskListsRoutes);

// Tasks routes (with cache and invalidation)
app.use('/api/task-lists', responseCache(300000), invalidateCache(), tasksRoutes);
app.use('/api/tasks', responseCache(300000), invalidateCache(), tasksRoutes);

// Collaborative editing routes
app.use('/api/task-lists', collaborativeRoutes);

// Share routes (with cache)
app.use('/api/share', responseCache(600000), shareRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

// Test database connection on startup
import { getDatabase } from './services/database';

async function testDatabaseConnection() {
  try {
    console.log('🔄 Testing database connection...');
    const db = getDatabase();
    await db.$connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Start server
testDatabaseConnection().then(() => {
  console.log(`🔄 Starting server on port ${PORT}...`);
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`🔗 Available on all network interfaces`);
    
    // Debug: Check if server is really listening
    const address = server.address();
    console.log('📍 Server address:', address);
  }).on('error', (err) => {
    console.error('❌ Server failed to start:', err);
    console.error('❌ Error details:', err.message);
    process.exit(1);
  });
  
  server.on('listening', () => {
    console.log('🎧 Server is listening...');
  });
  
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

export default app;
