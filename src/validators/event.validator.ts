import { z } from 'zod';
import { EventType } from '@prisma/client';

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const getEventByIdSchema = z.object({
  id: uuidSchema,
});

export const eventListQuerySchema = z.object({
  eventType: z.nativeEnum(EventType).optional(),
  residentId: uuidSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict().refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'startDate must be before or equal to endDate' }
);

export type GetEventByIdInput = z.infer<typeof getEventByIdSchema>;
export type EventListQueryInput = z.infer<typeof eventListQuerySchema>;
