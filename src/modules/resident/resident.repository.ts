import prisma from '../../config/prisma';
import { Prisma, LifeStatus, DomicileStatus } from '@prisma/client';

type Client = Prisma.TransactionClient | typeof prisma;

export function create(data: Prisma.ResidentCreateInput, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.resident.create({ data });
}

export function findById(id: string) {
  return prisma.resident.findFirst({
    where: { id, isActive: true },
    include: {
      family: {
        select: {
          id: true,
          noKK: true,
          alamat: true,
        },
      },
    },
  });
}

export function findByNik(nik: string) {
  return prisma.resident.findFirst({
    where: { nik, isActive: true },
  });
}

export function findMany(skip: number, take: number) {
  return prisma.resident.findMany({
    where: { isActive: true },
    include: {
      family: {
        select: {
          id: true,
          noKK: true,
          alamat: true,
        },
      },
    },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export function count() {
  return prisma.resident.count({
    where: { isActive: true },
  });
}

export function update(id: string, data: Prisma.ResidentUpdateInput, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.resident.update({
    where: { id },
    data,
  });
}

export function softDelete(id: string, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.resident.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });
}

export function updateLifeStatus(id: string, status: LifeStatus, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.resident.update({
    where: { id },
    data: { lifeStatus: status },
  });
}

export function updateDomicileStatus(id: string, status: DomicileStatus, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.resident.update({
    where: { id },
    data: { domicileStatus: status },
  });
}
