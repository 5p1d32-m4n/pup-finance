import { Router, Request, Response } from "express";
import prisma from "../../config/prisma";
import {body} from "express-validator";
import {
    getCurrentUser,
    updateUser,
    deleteCurrentUser
} from "./user.controller";
import { jwtCheck } from "../auth/auth.middleware";
import { validate } from "@/middleware/validationMiddleware";
import { UserUpdateSchema } from "@/schemas/user.schema";

const router = Router();

// This is redundant because `jwtCheck` is already applied globally in `app.ts`.
// router.use(jwtCheck);

router.get('/me', getCurrentUser);
router.patch('/me', validate(UserUpdateSchema), updateUser);
router.delete('/me', deleteCurrentUser);

router.post('/sync', 
  [
    body('auth0Id').isString(),
    body('email').isEmail().optional(),
    body('name').isString().optional()
  ],
  async (req: Request, res: Response) => {
    // Verify secret (critical for security)
    if (req.headers['x-auth0-secret'] !== process.env.API_SERVICE_TOKEN) {
      return res.sendStatus(401);
    }

    const { auth0Id, ...userData } = req.body;
    
    await prisma.user.upsert({
      where: { auth0Id },
      create: { 
        auth0Id,
        ...userData,
        lastLogin: new Date() 
      },
      update: { 
        ...userData,
        lastLogin: new Date() 
      }
    });

    res.sendStatus(200);
  }
);


export default router;