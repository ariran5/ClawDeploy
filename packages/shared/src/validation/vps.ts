import { z } from 'zod';

export const createVpsSchema = z.object({
  name: z.string().min(1, 'Server name is required').max(255),
  host: z.string().min(1, 'Host is required').max(255),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1, 'Username is required').max(128),
  authMethod: z.enum(['password', 'key']),
  credential: z.string().min(1, 'Credential is required'),
  provider: z.string().max(64).default('other'),
});

export const updateVpsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  host: z.string().min(1).max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().min(1).max(128).optional(),
  authMethod: z.enum(['password', 'key']).optional(),
  credential: z.string().min(1).optional(),
  provider: z.string().max(64).optional(),
});

export type CreateVpsInput = z.infer<typeof createVpsSchema>;
export type UpdateVpsInput = z.infer<typeof updateVpsSchema>;
