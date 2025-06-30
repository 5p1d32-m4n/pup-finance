import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { UserUpdateSchema } from '../schemas/user.schema'; // Zod schema we'll create

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.auth?.payload?.sub) {
      return res.status(401).json({ message: 'Unauthorized: User ID not found in token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.payload.sub as string },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      }
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.auth?.payload?.sub) {
      return res.status(401).json({ message: 'Unauthorized: User ID not found in token.' });
    }

    const validatedData = UserUpdateSchema.parse(req.body);
    const updatedUser = await prisma.user.update({
      where: { id: req.auth.payload.sub as string },
      data: validatedData,
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const deleteCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.auth?.payload?.sub) {
      return res.status(401).json({ message: 'Unauthorized: User ID not found in token.' });
    }

    await prisma.user.delete({
      where: { id: req.auth.payload.sub as string }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};