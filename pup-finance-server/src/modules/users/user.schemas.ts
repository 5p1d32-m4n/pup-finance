import { body } from 'express-validator';
import { z } from 'zod';

/**
 * @description Schema for validating the payload from the Auth0 Post-Login Action.
 * This ensures the data sent from Auth0 to your /api/users/sync endpoint is well-formed.
 */

export const UserSyncSchema = z.object({
    body: z.object({
        auth0Id: z.string().min(1, 'Auth0 ID is required.'),
        email: z.string().email('A valid email is required.'),
        givenName: z.string().optional(),
        familyName: z.string().optional(),
        profilePictureUrl: z.string().url('A valid URL is required for the profile picture.').optional(),
    }),
});

/**
 * @description Schema for validating updates to a user's profile by the user themselves.
 * This is an example for your existing /api/users/me endpoint.
 */
export const UserUpdateSchema = z.object({
    body: z.object({
        username: z.string().min(3).max(128).optional(),
        givenName: z.string().optional(),
        familyName: z.string().optional(),
        phoneNumber: z.string().optional(),
    })
});