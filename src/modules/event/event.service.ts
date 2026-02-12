import * as eventRepo from './event.repository';
import { getEventByIdSchema, eventListQuerySchema } from '../../validators/event.validator';
import { NotFoundError } from '../../utils/appError';

export async function getEventById(id: string) {
  const { id: validId } = getEventByIdSchema.parse({ id });

  const event = await eventRepo.findById(validId);
  if (!event) {
    throw new NotFoundError('Event not found');
  }

  return event;
}

export async function listEvents(query: Record<string, unknown>) {
  const { eventType, residentId, startDate, endDate, page, limit } =
    eventListQuerySchema.parse(query);

  const skip = (page - 1) * limit;
  const filters = { eventType, residentId, startDate, endDate };

  const [events, total] = await Promise.all([
    eventRepo.findMany(skip, limit, filters),
    eventRepo.count(filters),
  ]);

  return {
    data: events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
