import { z } from 'zod';

export const statisticsSummaryQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
}).strict();

export type StatisticsSummaryQueryInput = z.infer<typeof statisticsSummaryQuerySchema>;
