import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

type Auth0Payload = {
  sub: string;
  permissions?: string[];
  [key: string]: any;
};

export const auditLogMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip if no auth payload (public routes)
  if (!req.auth?.payload) return next();

  const payload = req.auth.payload as Auth0Payload;
  const userId = payload.sub;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  // Extract entity info from path
  const [entityType, entityId] = req.originalUrl
    .split('/')
    .filter(Boolean);

  // Prepare metadata (redacting sensitive fields)
  const metadata: Prisma.JsonObject = {
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    params: req.params,
    ...(req.method !== 'GET' && { 
      body: redactSensitiveFields(req.body) 
    })
  };

  // Create log in background (don't block request)
  setImmediate(async () => {
    try {
      await prisma.auditLog.create({
        data: {
          eventType: 'API_REQUEST',
          entityType: entityType || 'SYSTEM',
          entityId: entityId,
          operationType: req.method,
          user: { connect: { auth0Id: userId } }, // Critical for Auth0
          ipAddress,
          userAgent,
          metadata,
          auth0Metadata: { // Special Auth0 context
            clientId: payload.azp,
            scope: payload.scope,
            permissions: payload.permissions
          } as Prisma.JsonObject
        }
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  });

  next();
};

function redactSensitiveFields(data: any): any {
  if (!data) return data;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'creditCard'];
  const redacted = { ...data };

  sensitiveKeys.forEach(key => {
    if (redacted[key]) {
      redacted[key] = '*****';
    }
  });

  return redacted;
}