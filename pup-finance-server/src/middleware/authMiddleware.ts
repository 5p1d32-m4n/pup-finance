import dotenv from 'dotenv';
import { auth } from 'express-oauth2-jwt-bearer';
import { Request, Response, NextFunction } from 'express';

dotenv.config();

// Type for Auth0 token payload
interface Auth0Payload {
  sub: string;
  [key: string]: any; // For custom claims
}

// Environment validation
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.error('Missing Auth0 configuration');
  process.exit(1);
}

// JWT Validation
export const jwtCheck = auth({
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256'
});

// Permission checking
export const checkPermissions = (requiredPermissions: string[]) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const payload = req.auth?.payload as Auth0Payload;
  const permissionsClaim = `${AUTH0_AUDIENCE}/permissions`;
  const userPermissions: string[] = payload[permissionsClaim] || [];

  const hasAllPermissions = requiredPermissions.every(p => 
    userPermissions.includes(p)
  );

  if (hasAllPermissions) return next();
  res.status(403).json({ message: 'Insufficient permissions' });
};

// Role checking
export const checkRoles = (requiredRoles: string[]) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const payload = req.auth?.payload as Auth0Payload;
  const rolesClaim = 'https://pupfinance.com/roles';
  const userRoles: string[] = payload[rolesClaim] || [];

  const hasRequiredRole = requiredRoles.some(r => 
    userRoles.includes(r)
  );

  if (hasRequiredRole) return next();
  res.status(403).json({ message: 'Insufficient role' });
};

// Error handling
export const handleAuthErrors = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err && err.status && err.code) {
    console.error('Auth error:', err);
    return res.status(err.status).json({ 
      code: err.code, 
      message: err.message 
    });
  }
  next(err);
};