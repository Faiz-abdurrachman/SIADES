import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import * as familyRepo from './family.repository';
import {
  createFamilySchema,
  updateFamilySchema,
  paginationSchema,
  CreateFamilyInput,
  UpdateFamilyInput,
} from '../../validators/family.validator';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/appError';

const uuidSchema = z.string().uuid('Invalid UUID format');

function validateUUID(id: string): string {
  const result = uuidSchema.safeParse(id);
  if (!result.success) {
    throw new ValidationError('Invalid UUID format');
  }
  return result.data;
}

function handlePrismaError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new ConflictError('Family with this noKK already exists');
  }
  throw error;
}

export async function createFamily(input: CreateFamilyInput, actorId: string) {
  const data = createFamilySchema.parse(input);

  const existing = await familyRepo.findByNoKK(data.noKK);
  if (existing) {
    throw new ConflictError('Family with this noKK already exists');
  }

  let family;
  try {
    family = await familyRepo.create(data);
  } catch (error) {
    handlePrismaError(error);
  }

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      tableName: 'Family',
      recordId: family.id,
      userId: actorId,
    },
  });

  return family;
}

export async function getFamilyById(id: string) {
  validateUUID(id);

  const family = await familyRepo.findById(id);
  if (!family) {
    throw new NotFoundError('Family not found');
  }

  return family;
}

export async function listFamilies(query: { page?: unknown; limit?: unknown }) {
  const { page, limit } = paginationSchema.parse(query);
  const skip = (page - 1) * limit;

  const [families, total] = await Promise.all([
    familyRepo.findMany(skip, limit),
    familyRepo.count(),
  ]);

  return {
    data: families,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateFamily(id: string, input: UpdateFamilyInput, actorId: string) {
  validateUUID(id);

  const data = updateFamilySchema.parse(input);

  const existing = await familyRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Family not found');
  }

  if (data.noKK && data.noKK !== existing.noKK) {
    const conflict = await familyRepo.findByNoKK(data.noKK);
    if (conflict) {
      throw new ConflictError('Family with this noKK already exists');
    }
  }

  let updated;
  try {
    updated = await familyRepo.update(id, data);
  } catch (error) {
    handlePrismaError(error);
  }

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      tableName: 'Family',
      recordId: id,
      userId: actorId,
    },
  });

  return updated;
}

export async function deleteFamily(id: string, actorId: string) {
  validateUUID(id);

  const existing = await familyRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Family not found');
  }

  const activeResidents = await familyRepo.countActiveResidents(id);
  if (activeResidents > 0) {
    throw new ConflictError('Cannot delete family with active residents');
  }

  await prisma.$transaction(async (tx) => {
    await familyRepo.softDeleteTx(tx, id);

    await tx.auditLog.create({
      data: {
        action: 'DELETE',
        tableName: 'Family',
        recordId: id,
        userId: actorId,
      },
    });
  });
}
