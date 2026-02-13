import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';

type Client = Prisma.TransactionClient | typeof prisma;

const roleSelect = {
  select: {
    id: true,
    name: true,
  },
} as const;

export function create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.user.create({ data });
}

export function findById(id: string) {
  return prisma.user.findFirst({
    where: { id, isActive: true },
    include: { role: roleSelect },
  });
}

export function findByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email, isActive: true },
    include: { role: roleSelect },
  });
}

export function findMany(skip: number, take: number) {
  return prisma.user.findMany({
    where: { isActive: true },
    include: { role: roleSelect },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export function count() {
  return prisma.user.count({
    where: { isActive: true },
  });
}

export function update(id: string, data: Prisma.UserUpdateManyMutationInput, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.user.updateMany({
    where: { id, isActive: true },
    data,
  });
}

export function softDelete(id: string, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.user.updateMany({
    where: { id, isActive: true },
    data: { isActive: false, deletedAt: new Date() },
  });
}
