import { z } from 'zod';

export const createFamilySchema = z.object({
  noKK: z
    .string()
    .length(16, 'noKK must be exactly 16 characters')
    .regex(/^\d+$/, 'noKK must be numeric only'),
  alamat: z
    .string()
    .min(5, 'alamat must be at least 5 characters')
    .max(255, 'alamat must be at most 255 characters'),
  rt: z
    .string()
    .max(3, 'rt must be at most 3 characters')
    .regex(/^\d+$/, 'rt must be numeric only'),
  rw: z
    .string()
    .max(3, 'rw must be at most 3 characters')
    .regex(/^\d+$/, 'rw must be numeric only'),
  dusun: z
    .string()
    .min(2, 'dusun must be at least 2 characters')
    .max(100, 'dusun must be at most 100 characters'),
});

export const updateFamilySchema = createFamilySchema.partial();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
