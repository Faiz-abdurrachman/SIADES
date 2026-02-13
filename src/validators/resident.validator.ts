import { z } from 'zod';
import { Gender, MaritalStatus, LifeStatus, DomicileStatus } from '@prisma/client';

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const createResidentSchema = z.object({
  nik: z
    .string()
    .length(16, 'nik must be exactly 16 characters')
    .regex(/^\d{16}$/, 'nik must be numeric only'),
  fullName: z
    .string()
    .min(2, 'fullName must be at least 2 characters')
    .max(255, 'fullName must be at most 255 characters'),
  birthPlace: z
    .string()
    .min(2, 'birthPlace must be at least 2 characters')
    .max(100, 'birthPlace must be at most 100 characters'),
  birthDate: z
    .coerce.date()
    .refine((date) => date <= new Date(), {
      message: 'birthDate must not be in the future',
    }),
  gender: z.nativeEnum(Gender),
  religion: z
    .string()
    .min(2, 'religion must be at least 2 characters')
    .max(50, 'religion must be at most 50 characters'),
  education: z
    .string()
    .min(2, 'education must be at least 2 characters')
    .max(100, 'education must be at most 100 characters'),
  occupation: z
    .string()
    .min(2, 'occupation must be at least 2 characters')
    .max(100, 'occupation must be at most 100 characters'),
  maritalStatus: z.nativeEnum(MaritalStatus),
  lifeStatus: z.nativeEnum(LifeStatus).optional(),
  domicileStatus: z.nativeEnum(DomicileStatus),
  phone: z
    .string()
    .max(20, 'phone must be at most 20 characters')
    .optional()
    .nullable(),
  familyId: uuidSchema,
}).strict();

export const updateResidentSchema = createResidentSchema
  .omit({ lifeStatus: true, domicileStatus: true })
  .partial()
  .strict();

export const patchLifeStatusSchema = z.object({
  lifeStatus: z.nativeEnum(LifeStatus),
}).strict();

export const patchDomicileStatusSchema = z.object({
  domicileStatus: z.nativeEnum(DomicileStatus),
}).strict();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export type CreateResidentInput = z.infer<typeof createResidentSchema>;
export type UpdateResidentInput = z.infer<typeof updateResidentSchema>;
export type PatchLifeStatusInput = z.infer<typeof patchLifeStatusSchema>;
export type PatchDomicileStatusInput = z.infer<typeof patchDomicileStatusSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
