import { Prisma } from '@prisma/client';

declare global {
  namespace Express {
    interface Auth0Payload {
      sub: string;                   // "auth0|12345"
      azp?: string;                  // Auth0 client ID
      scope?: string;                // "openid profile email"
      permissions?: string[];        // ["read:users", "write:transactions"]
      [key: string]: any;            // Allow other custom claims
    }

    interface Request {
      auth?: {
        payload: Auth0Payload;       // Type-safe access to Auth0 data
      };
    }
  }
}

// Optional: Extended Prisma types
export type Auth0User = Prisma.UserGetPayload<{
  select: {
    id: true;
    auth0Id: true;
    email: true;
  }
}>;