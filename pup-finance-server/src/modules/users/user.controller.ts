import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { v4 as uuidv4 } from 'uuid';
import { UserUpdateSchema } from '@/schemas/user.schema';

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
        username: true,
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
        username: true
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

/**
 * @description Synchronizes a user from Auth0 to the local database.
 * Called by the Auth0 Post-Login Action. It uses `upsert` to either create
 * a new user on their first login or update their `lastLogin` time on subsequent logins.
 * @param req The Express request object, containing validated user data in the body.
 * @param res The Express response object.
 */
export const syncUser = async (req: Request, res: Response) => {
  const { auth0Id, email, givenName, familyName, profilePictureUrl } = req.body;
  try {
    // on first login, a username is required my my shcema.
    // I'll generate a unique one from the email's local part + a random suffix.
    // e.g. 'test.user@mail.com' -> 'test.user_a1b2c3d4'
    const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const randomSuffix = uuidv4().split('-')[0]; // a short random string
    const generatedUsername = `${usernameBase}_${randomSuffix}`;

    const user = await prisma.user.upsert({
      where: { auth0Id: auth0Id },
      // CREATE: Runs only if the user with the auth0Id does not exist.
      create: {
        auth0Id: auth0Id,
        email: email,
        username: generatedUsername, // The generated unique username
        givenName: givenName,
        familyName: familyName,
        profilePictureUrl: profilePictureUrl,
        lastLogin: new Date(),
        emailVerified: true, // If they logged in via Auth0, we can consider the email verified.
      },
      // UPDATE: Runs if the user already exists.
      update: {
        lastLogin: new Date(),
        // TODO: might want to update these fields in case they change in Auth0.
        givenName: givenName,
        familyName: familyName,
        profilePictureUrl: profilePictureUrl,
      },
    });

    console.log(`User ${user.id} synced successfully.`);
    res.status(200).json({ message: 'User synced successfully', userId: user.id });

  } catch (error: any) {
    console.error('Error during user sync:', error);
    // Check for unique constraint violation on username, though unlikely with random suffix.
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return res.status(409).json({ error: 'Username generation conflict. Please try again.' });
    }
    res.status(500).json({ error: 'Failed to sync user.' });
  }
}