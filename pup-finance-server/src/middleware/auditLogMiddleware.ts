import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

interface AuditLogData {
  userId: string;
  action: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export const auditLogMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.auth?.payload) {
    const userId = req.auth.payload.sub;
    const action = `${req.method} ${req.originalUrl}`;
    const ipAddress = req.ip;

    // Skip sensitive fields
    const sanitizedBody = req.body?.password 
      ? { ...req.body, password: '*****' } 
      : req.body;

    const logData: AuditLogData = {
      userId: userId as string,
      action,
      ipAddress,
      metadata: {
        method: req.method,
        path: req.originalUrl,
        ...(req.method !== 'GET' && { body: sanitizedBody })
      }
    };

    // Console log (development)
    console.log('[AUDIT]', logData);

    // Database log (production)
    if (process.env.NODE_ENV === 'production') {
      try {
        await prisma.auditLog.create({
          data: {
            userId: logData.userId!, // Add non-null assertion as userId is guaranteed to exist here
            action: logData.action,
            ipAddress: logData.ipAddress,
            metadata: logData.metadata
          }
        });
      } catch (err) {
        console.error('Audit log failed:', err);
      }
    }
  }
  next();
};