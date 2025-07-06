import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import { errorHandler } from '@/shared/middleware/error';
import { sendSuccess } from '@/shared/utils/response';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));

// Rate limiting (disabled in test environment)
if (config.env !== 'test') {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  });

  app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  sendSuccess(
    res,
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      services: {
        auth: 'ok',
        collaborative: 'ok',
      },
    },
    'System is healthy'
  );
});

// Metrics endpoint
import { MetricsController } from '@/modules/metrics/metrics.controller';
app.get('/metrics', MetricsController.getBasicMetrics);
app.get('/metrics/detailed', MetricsController.getDetailedMetrics);

// Routes
import routes from '@/routes';
app.use('/api', routes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;