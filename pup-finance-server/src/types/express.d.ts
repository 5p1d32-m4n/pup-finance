// src/types/express.d.ts
import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        payload: JwtPayload & {
          sub: string;
          permissions?: string[];
          roles?: string[];
        };
      };
    }
  }
}
