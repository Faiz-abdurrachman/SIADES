import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';

type Client = Prisma.TransactionClient | typeof prisma;

// ─── LETTER TYPE SELECT ────────────────────────────────────

const letterTypeBasicSelect = {
  select: {
    id: true,
    name: true,
  },
} as const;

// ─── LETTER TYPE ───────────────────────────────────────────

export function createLetterType(data: Prisma.LetterTypeCreateInput, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.letterType.create({ data });
}

export function findLetterTypeById(id: string) {
  return prisma.letterType.findFirst({
    where: { id, isActive: true },
  });
}

export function findManyLetterTypes(skip: number, take: number) {
  return prisma.letterType.findMany({
    where: { isActive: true },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export function countLetterTypes() {
  return prisma.letterType.count({
    where: { isActive: true },
  });
}

export function updateLetterType(id: string, data: Prisma.LetterTypeUpdateManyMutationInput, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.letterType.updateMany({
    where: { id, isActive: true },
    data,
  });
}

export function softDeleteLetterType(id: string, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.letterType.updateMany({
    where: { id, isActive: true },
    data: { isActive: false },
  });
}

// ─── LETTER REQUEST ────────────────────────────────────────

export function createLetterRequest(data: Prisma.LetterRequestCreateInput, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.letterRequest.create({ data });
}

export function findLetterRequestById(id: string) {
  return prisma.letterRequest.findFirst({
    where: { id },
    include: {
      letterType: letterTypeBasicSelect,
      signature: true,
    },
  });
}

export function findManyLetterRequests(
  skip: number,
  take: number,
  where?: Prisma.LetterRequestWhereInput,
  orderBy?: Prisma.LetterRequestOrderByWithRelationInput
) {
  return prisma.letterRequest.findMany({
    where: where ?? {},
    include: {
      letterType: letterTypeBasicSelect,
    },
    skip,
    take,
    orderBy: orderBy ?? { createdAt: 'desc' },
  });
}

export function countLetterRequests(where?: Prisma.LetterRequestWhereInput) {
  return prisma.letterRequest.count({
    where: where ?? {},
  });
}

export function updateLetterRequest(id: string, data: Prisma.LetterRequestUpdateManyMutationInput, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.letterRequest.updateMany({
    where: { id },
    data,
  });
}

// ─── DIGITAL SIGNATURE ────────────────────────────────────

export function createDigitalSignature(data: Prisma.DigitalSignatureCreateInput, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.digitalSignature.create({ data });
}

export function findDigitalSignatureByLetterRequestId(letterRequestId: string) {
  return prisma.digitalSignature.findUnique({
    where: { letterRequestId },
  });
}
