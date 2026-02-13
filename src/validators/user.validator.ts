import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, 'name must be at least 2 characters')
    .max(100, 'name must be at most 100 characters'),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'password must be at least 8 characters')
    .max(100, 'password must be at most 100 characters'),
  roleId: z.string().uuid('Invalid UUID format'),
}).strict();

export const updateUserSchema = createUserSchema.partial().strict();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
