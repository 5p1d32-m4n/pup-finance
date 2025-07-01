import { Router } from "express";
import {
    getCurrentUser,
    updateUser,
    deleteCurrentUser
} from "../controllers/user.controllers";
import { jwtCheck } from "@/middleware/authMiddleware";
import { validate } from "@/middleware/validationMiddleware";
import { UserUpdateSchema } from "@/schemas/user.schema";

const router = Router();

router.use(jwtCheck); // All user routes require auth.

router.get('/me', getCurrentUser);
router.patch('/me', validate(UserUpdateSchema), updateUser);
router.delete('/me', deleteCurrentUser);

export default router;