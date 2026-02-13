import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import logger from './config/logger';
import { requestId } from './middleware/requestId';
import { apiResponse } from './utils/apiResponse';
import { errorHandler } from './middleware/errorHandler';
import prisma from './config/prisma';
import authRouter from './modules/auth/auth.routes';
import familyRouter from './modules/family/family.routes';
import residentRouter from './modules/resident/resident.routes';
import eventRouter from './modules/event/event.routes';
import statisticsRouter from './modules/statistics/statistics.routes';
import userRouter from './modules/user/user.routes';
import letterRouter from './modules/letter/letter.routes';

const app = express();

// Security hardening
app.disable('x-powered-by');
app.use(helmet());
app.use(cors(
  process.env.CORS_ORIGIN
    ? { origin: process.env.CORS_ORIGIN }
    : undefined
));
app.use(express.json({ limit: '1mb' }));

// Observability
app.use(requestId);
app.use(pinoHttp({
  logger,
  genReqId: (req) => (req as express.Request).id ?? 'unknown',
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          ...req.headers,
          authorization: req.headers.authorization ? '[REDACTED]' : undefined,
        },
      };
    },
  },
  autoLogging: {
    ignore: (req) => (req as express.Request).url === '/api/health',
  },
}));

// Rate limiter for login endpoint
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// Health check
app.get('/api/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    apiResponse({
      res,
      success: true,
      message: 'Server is running and database is connected',
    });
  } catch (error) {
    next(error);
  }
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/families', familyRouter);
app.use('/api/residents', residentRouter);
app.use('/api/events', eventRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/users', userRouter);
app.use('/api/letters', letterRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;
