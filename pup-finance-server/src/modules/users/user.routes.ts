import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../config/prisma";
import { body } from "express-validator";
import { jwtCheck } from "../auth/auth.middleware";
import {
  getCurrentUser,
  updateUser,
  deleteCurrentUser,
  syncUser,
} from "./user.controller";
import { validate } from "../../middleware/validationMiddleware";
import { UserUpdateSchema, UserSyncSchema } from "./user.schemas";

const router = Router();

/**
 * @description Middleware to verify the secret token sent from the Auth0 Action.
 * This is CRITICAL to ensure that only Auth0 can call the /users/sync endpoint.
 */
const verifyActionSecret = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const secretFromHeader = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (secretFromHeader && secretFromHeader === process.env.API_SERVICE_TOKEN) {
    return next(); // Token is valid, proceed to the next middleware/controller.
  }

  // If the token is missing or invalid, deny access.
  res.status(401).json({ error: 'Unauthorized: Invalid or missing action secret.' });
};

router.get('/me', jwtCheck, getCurrentUser);
router.patch('/me', jwtCheck, validate(UserUpdateSchema), updateUser);
router.delete('/me', jwtCheck, deleteCurrentUser);

router.post('/sync',
  verifyActionSecret,
  validate(UserSyncSchema),
  syncUser
);


export default router;