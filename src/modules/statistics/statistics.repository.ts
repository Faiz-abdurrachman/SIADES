import prisma from '../../config/prisma';

export function findEventsByDateRange(startDate: Date, endDate: Date) {
  return prisma.populationEvent.findMany({
    where: {
      eventDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      eventType: true,
      eventDate: true,
    },
  });
}
