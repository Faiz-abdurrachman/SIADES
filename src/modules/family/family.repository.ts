import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';

export function create(data: Prisma.FamilyCreateInput) {
  return prisma.family.create({ data });
}

export function findById(id: string) {
  return prisma.family.findFirst({
    where: { id, isActive: true },
  });
}

export function findByNoKK(noKK: string) {
  return prisma.family.findFirst({
    where: { noKK, isActive: true },
  });
}

export function findMany(skip: number, take: number) {
  return prisma.family.findMany({
    where: { isActive: true },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export function count() {
  return prisma.family.count({
    where: { isActive: true },
  });
}

export function update(id: string, data: Prisma.FamilyUpdateInput) {
  return prisma.family.update({
    where: { id },
    data,
  });
}

export function softDelete(id: string) {
  return prisma.family.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });
}

export function softDeleteTx(tx: Prisma.TransactionClient, id: string) {
  return tx.family.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });
}

export function countActiveResidents(familyId: string) {
  return prisma.resident.count({
    where: { familyId, isActive: true },
  });
}
