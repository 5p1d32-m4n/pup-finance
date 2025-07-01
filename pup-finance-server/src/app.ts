import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { 
  jwtCheck, 
  checkPermissions, 
  checkRoles, 
  handleAuthErrors,
} from './middleware/authMiddleware';
import {auditLogMiddleware} from './middleware/auditLogMiddleware';
import prisma from './config/prisma';
import { Request, Response, NextFunction } from 'express';

const app = express();

// --- Core security middleware ---
app.use(helmet()); // HTTP security headers
app.use(hpp() as any); // Protection against HTTP Parameter Pollution attacks

// --- Rate limiting ---
const API_RATE_LIMIT_WINDOW_MINUTES = process.env.API_RATE_LIMIT_WINDOW || '15';
const apiLimiter = rateLimit({
  windowMs: parseInt(API_RATE_LIMIT_WINDOW_MINUTES) * 60 * 1000,
  max: 100,
  message: `Too many requests from this IP, please try again after ${API_RATE_LIMIT_WINDOW_MINUTES} minutes.`,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter as any);

// --- Body parsing ---
app.use(express.json());

// --- Global Authentication Middleware ---
app.use(jwtCheck as any);

// --- Audit Logging ---
app.use(auditLogMiddleware);

// --- Routes ---
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, Pup-Finance! Your token is valid.');
});

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
  '/accounts/:accountId', 
  checkPermissions(['read:accounts']), 
  (req: Request, res: Response) => {
    const { accountId } = req.params;
    res.json({ 
      message: `Accessing account ${accountId}`, 
      data: { balance: 1234.56, currency: 'USD' } 
    });
  }
);

app.post(
  '/transactions', 
  checkPermissions(['write:transactions']), 
  (req: Request, res: Response) => {
    const { amount, type, description } = req.body;
    res.status(201).json({ 
      message: 'Transaction created successfully', 
      transaction: { amount, type, description } 
    });
  }
);

app.put(
  '/users/:userId', 
  checkPermissions(['manage:users']), 
  (req: Request, res: Response) => {
    const { userId } = req.params;
    res.json({ message: `User ${userId} updated successfully.` });
  }
);

app.get(
  '/admin-dashboard', 
  checkRoles(['admin']), 
  (req: Request, res: Response) => {
    res.json({ message: 'Welcome, Admin! This is your dashboard data.' });
  }
);

// --- Error Handling ---
app.use(handleAuthErrors);

// --- Server Setup ---
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// --- Cleanup Handling ---
process.on('SIGTERM', async () => {
  console.log('SIGTERM received - shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
  });
});

export default app;