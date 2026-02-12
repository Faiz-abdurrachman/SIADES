import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';

export interface EventFilters {
  eventType?: Prisma.PopulationEventWhereInput['eventType'];
  residentId?: string;
  startDate?: Date;
  endDate?: Date;
}

function buildWhere(filters: EventFilters): Prisma.PopulationEventWhereInput {
  const where: Prisma.PopulationEventWhereInput = {};

  if (filters.eventType) {
    where.eventType = filters.eventType;
  }

  if (filters.residentId) {
    where.residentId = filters.residentId;
  }

  if (filters.startDate || filters.endDate) {
    where.eventDate = {};
    if (filters.startDate) {
      where.eventDate.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.eventDate.lte = filters.endDate;
    }
  }

  return where;
}

const residentSelect = {
  select: {
    id: true,
    nik: true,
    fullName: true,
  },
} as const;

export function findById(id: string) {
  return prisma.populationEvent.findUnique({
    where: { id },
    include: { resident: residentSelect },
  });
}

export function findMany(skip: number, take: number, filters: EventFilters) {
  return prisma.populationEvent.findMany({
    where: buildWhere(filters),
    include: { resident: residentSelect },
    skip,
    take,
    orderBy: { eventDate: 'desc' },
  });
}

export function count(filters: EventFilters) {
  return prisma.populationEvent.count({
    where: buildWhere(filters),
  });
}
