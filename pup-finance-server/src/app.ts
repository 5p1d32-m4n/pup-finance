import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { 
  jwtCheck, 
  checkPermissions, 
  checkRoles, 
  handleAuthErrors,
} from './modules/auth/auth.middleware';
import {auditLogMiddleware} from './modules/auditLog/auditLog.middleware';
import userRoutes from './modules/users/user.routes';
import prisma from './config/prisma';
import { Request, Response, NextFunction } from 'express';

const app = express();

// --- Core security middleware ---
app.use(helmet()); // HTTP security headers
app.use(hpp()); // Protection against HTTP Parameter Pollution attacks

// --- Rate limiting ---
const API_RATE_LIMIT_WINDOW_MINUTES = process.env.API_RATE_LIMIT_WINDOW || '15';
const apiLimiter = rateLimit({
  windowMs: parseInt(API_RATE_LIMIT_WINDOW_MINUTES) * 60 * 1000,
  max: 100,
  message: `Too many requests from this IP, please try again after ${API_RATE_LIMIT_WINDOW_MINUTES} minutes.`,
});

app.use('/api/', apiLimiter);

// --- Body parsing ---
app.use(express.json());

// --- Audit Logging ---
app.use(auditLogMiddleware);

// --- Routes ---
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, Pup-Finance!');
});

app.use('/api/users', userRoutes);

app.get('/test-db', async (req: Request, res: Response) => {
  try {
    const result = await prisma.$queryRaw<{ now: string }[]>`SELECT NOW()`;
    res.status(200).json({
      message: 'Database connection successful with Prisma!', 
      timestamp: result[0].now 
    });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Protected Routes ---

app.get(
  '/admin-dashboard', 
  jwtCheck,
  checkRoles(['admin']), 
  (req: Request, res: Response) => {
    res.json({ message: 'Welcome, Admin! This is your dashboard data.' });
  }
);

// --- Error Handling ---
app.use(handleAuthErrors);

export default app;