
import dotenv from 'dotenv';
import { auth, JWTPayload } from 'express-oauth2-jwt-bearer';
import { JWTHeaderParameters } from 'jose';
import { Request, Response, NextFunction,RequestHandler } from 'express';

dotenv.config();

// By augmenting the module, we are telling TypeScript to merge this interface
// with the original one from the library. This allows us to override the
// `payload` type with our more specific `Auth0Payload` interface, which
// now correctly extends the base `JWTPayload`.

// Our custom payload extends the default JWTPayload from the library.
export interface Auth0Payload extends JWTPayload {
  sub: string;
  permissions?: string[];
  [key: string]: any; // For other custom claims
}

// Environment validation
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.error('Missing Auth0 configuration');
  process.exit(1);
}

// JWT Validation
// For asymmetric algorithms like RS256, you must use `issuerBaseURL` so the
// library can discover the JWKS (JSON Web Key Set) endpoint and fetch the
// public key to verify the token signature. `tokenSigningAlg` is not
// necessary as it's also discovered.
export const jwtCheck = auth({
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
});

// Permission checking
// Type-safe middleware wrapper
export const checkPermissions = (permissions: string[]): RequestHandler => {
  return (req, res, next) => {
    // This middleware should run after jwtCheck, so req.auth and its payload are expected.
    const userPermissions = req.auth?.payload?.permissions;

    // Guard against missing or malformed permissions claim.
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return res.status(403).json({ message: 'Access denied: Permissions not available.' });
    }

    // Now, userPermissions is guaranteed to be a string array.
    const hasPermissions = permissions.every(p => userPermissions.includes(p));

    if (!hasPermissions) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

// Role checking
export const checkRoles = (requiredRoles: string[]): RequestHandler => {
  return (req, res, next) => {
    // This middleware should run after jwtCheck, so req.auth and its payload are expected.
    const rolesClaim = 'https://pupfinance.com/roles';
    const userRoles = req.auth?.payload?.[rolesClaim];

    // Guard against missing or malformed roles claim.
    if (!userRoles || !Array.isArray(userRoles)) {
      return res.status(403).json({ message: 'Insufficient role: Roles claim not found or not an array.' });
    }

    // Now, userRoles is guaranteed to be an array.
    const hasRequiredRole = requiredRoles.some(r => userRoles.includes(r));

    if (hasRequiredRole) {
      return next();
    }

    res.status(403).json({ message: 'Insufficient role' });
  };
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