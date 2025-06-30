import { z } from 'zod';

export const UserUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  preferences: z.object({
    currency: z.string().length(3),
    locale: z.string()
  }).optional()
}).strict(); // Rejects unknown fields

export type UserUpdateData = z.infer<typeof UserUpdateSchema>;