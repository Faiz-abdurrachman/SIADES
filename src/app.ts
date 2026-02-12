import express from 'express';
import { apiResponse } from './utils/apiResponse';
import { errorHandler } from './middleware/errorHandler';
import prisma from './config/prisma';
import authRouter from './modules/auth/auth.routes';
import familyRouter from './modules/family/family.routes';

const app = express();

app.use(express.json());

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

// Error handler (must be last)
app.use(errorHandler);

export default app;
