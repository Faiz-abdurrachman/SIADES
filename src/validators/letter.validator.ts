import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID format');

// ─── LETTER TYPE ───────────────────────────────────────────

export const createLetterTypeSchema = z.object({
  name: z
    .string()
    .min(3, 'name must be at least 3 characters')
    .max(100, 'name must be at most 100 characters'),
  description: z
    .string()
    .max(255, 'description must be at most 255 characters')
    .optional(),
}).strict();

export const updateLetterTypeSchema = createLetterTypeSchema.partial().strict();

// ─── LETTER REQUEST ────────────────────────────────────────

export const createLetterRequestSchema = z.object({
  letterTypeId: uuidSchema,
  residentId: uuidSchema,
  purpose: z
    .string()
    .min(5, 'purpose must be at least 5 characters')
    .max(255, 'purpose must be at most 255 characters'),
}).strict();

export const verifyLetterRequestSchema = z.object({}).strict();

export const approveLetterRequestSchema = z.object({}).strict();

export const rejectLetterRequestSchema = z.object({
  reason: z
    .string()
    .min(3, 'reason must be at least 3 characters')
    .max(255, 'reason must be at most 255 characters'),
}).strict();

// ─── PAGINATION ────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

// ─── LETTER REQUEST QUERY ──────────────────────────────────

export const letterRequestQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'verified', 'approved', 'rejected']).optional(),
  letterTypeId: uuidSchema.optional(),
  residentId: uuidSchema.optional(),
  operatorId: uuidSchema.optional(),
  kepalaDesaId: uuidSchema.optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  sortBy: z.enum(['createdAt', 'approvedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).strict();

// ─── TYPES ─────────────────────────────────────────────────

export type CreateLetterTypeInput = z.infer<typeof createLetterTypeSchema>;
export type UpdateLetterTypeInput = z.infer<typeof updateLetterTypeSchema>;
export type CreateLetterRequestInput = z.infer<typeof createLetterRequestSchema>;
export type RejectLetterRequestInput = z.infer<typeof rejectLetterRequestSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type LetterRequestQueryInput = z.infer<typeof letterRequestQuerySchema>;
