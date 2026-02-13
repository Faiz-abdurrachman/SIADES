import { randomUUID } from 'crypto';
import { z } from 'zod';
import prisma from '../../config/prisma';
import * as letterRepo from './letter.repository';
import { Prisma } from '@prisma/client';
import {
  createLetterTypeSchema,
  updateLetterTypeSchema,
  createLetterRequestSchema,
  rejectLetterRequestSchema,
  paginationSchema,
  letterRequestQuerySchema,
  CreateLetterTypeInput,
  UpdateLetterTypeInput,
  CreateLetterRequestInput,
  RejectLetterRequestInput,
} from '../../validators/letter.validator';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/appError';

const uuidSchema = z.string().uuid('Invalid UUID format');

function validateUUID(id: string): string {
  const result = uuidSchema.safeParse(id);
  if (!result.success) {
    throw new ValidationError('Invalid UUID format');
  }
  return result.data;
}

// ─── LETTER TYPE ───────────────────────────────────────────

export async function createLetterType(input: CreateLetterTypeInput, adminUserId: string) {
  const data = createLetterTypeSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const created = await letterRepo.createLetterType(data, tx);

    await tx.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'LetterType',
        recordId: created.id,
        userId: adminUserId,
      },
    });

    return created;
  });
}

export async function updateLetterType(id: string, input: UpdateLetterTypeInput, adminUserId: string) {
  validateUUID(id);
  const data = updateLetterTypeSchema.parse(input);

  const existing = await letterRepo.findLetterTypeById(id);
  if (!existing) {
    throw new NotFoundError('Letter type not found');
  }

  await prisma.$transaction(async (tx) => {
    const result = await letterRepo.updateLetterType(id, data, tx);
    if (result.count === 0) {
      throw new NotFoundError('Letter type not found');
    }

    await tx.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'LetterType',
        recordId: id,
        userId: adminUserId,
      },
    });
  });

  const updated = await letterRepo.findLetterTypeById(id);
  if (!updated) {
    throw new NotFoundError('Letter type not found');
  }
  return updated;
}

export async function deleteLetterType(id: string, adminUserId: string) {
  validateUUID(id);

  const existing = await letterRepo.findLetterTypeById(id);
  if (!existing) {
    throw new NotFoundError('Letter type not found');
  }

  const approvedCount = await prisma.letterRequest.count({
    where: {
      letterTypeId: id,
      status: 'approved',
    },
  });

  if (approvedCount > 0) {
    throw new ValidationError('Cannot delete letter type used in approved requests');
  }

  await prisma.$transaction(async (tx) => {
    await letterRepo.softDeleteLetterType(id, tx);

    await tx.auditLog.create({
      data: {
        action: 'DELETE',
        tableName: 'LetterType',
        recordId: id,
        userId: adminUserId,
      },
    });
  });
}

export async function listLetterTypes(query: { page?: unknown; limit?: unknown }) {
  const { page, limit } = paginationSchema.parse(query);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    letterRepo.findManyLetterTypes(skip, limit),
    letterRepo.countLetterTypes(),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── LETTER REQUEST ────────────────────────────────────────

export async function createLetterRequest(input: CreateLetterRequestInput, operatorUserId: string) {
  const data = createLetterRequestSchema.parse(input);

  const letterType = await letterRepo.findLetterTypeById(data.letterTypeId);
  if (!letterType) {
    throw new NotFoundError('Letter type not found');
  }

  const resident = await prisma.resident.findFirst({
    where: { id: data.residentId, isActive: true },
  });
  if (!resident) {
    throw new NotFoundError('Resident not found');
  }

  return prisma.$transaction(async (tx) => {
    const created = await letterRepo.createLetterRequest(
      {
        status: 'pending',
        formPayload: { purpose: data.purpose },
        letterType: { connect: { id: data.letterTypeId } },
        resident: { connect: { id: data.residentId } },
        operator: { connect: { id: operatorUserId } },
      },
      tx
    );

    await tx.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'LetterRequest',
        recordId: created.id,
        userId: operatorUserId,
      },
    });

    return created;
  });
}

export async function verifyLetterRequest(id: string, operatorUserId: string) {
  validateUUID(id);

  await prisma.$transaction(async (tx) => {
    const current = await tx.letterRequest.findFirst({
      where: { id },
      select: { status: true, version: true },
    });

    if (!current) {
      throw new NotFoundError('Letter request not found');
    }

    if (current.status !== 'pending') {
      throw new ValidationError('Invalid status transition');
    }

    const result = await tx.letterRequest.updateMany({
      where: { id, status: 'pending', version: current.version },
      data: { status: 'verified', version: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new ConflictError('Concurrent modification detected');
    }

    await tx.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'LetterRequest',
        recordId: id,
        userId: operatorUserId,
      },
    });
  });

  return letterRepo.findLetterRequestById(id);
}

export async function approveLetterRequest(id: string, kepalaDesaUserId: string) {
  validateUUID(id);

  await prisma.$transaction(async (tx) => {
    const current = await tx.letterRequest.findFirst({
      where: { id },
      select: { status: true, version: true },
    });

    if (!current) {
      throw new NotFoundError('Letter request not found');
    }

    if (current.status !== 'verified') {
      throw new ValidationError('Invalid status transition');
    }

    const result = await tx.letterRequest.updateMany({
      where: { id, status: 'verified', version: current.version },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        kepalaDesaId: kepalaDesaUserId,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictError('Concurrent modification detected');
    }

    const signatureCode = randomUUID();

    await letterRepo.createDigitalSignature(
      {
        signatureImagePath: `/signatures/${signatureCode}.png`,
        documentHash: signatureCode,
        qrCodePath: `/qrcodes/${signatureCode}.png`,
        letterRequest: { connect: { id } },
      },
      tx
    );

    await tx.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'LetterRequest',
        recordId: id,
        userId: kepalaDesaUserId,
      },
    });
  });

  return letterRepo.findLetterRequestById(id);
}

export async function rejectLetterRequest(id: string, input: RejectLetterRequestInput, actorUserId: string) {
  validateUUID(id);
  const data = rejectLetterRequestSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    const current = await tx.letterRequest.findFirst({
      where: { id },
      select: { status: true, version: true },
    });

    if (!current) {
      throw new NotFoundError('Letter request not found');
    }

    if (current.status !== 'pending' && current.status !== 'verified') {
      throw new ValidationError('Invalid status transition');
    }

    const result = await tx.letterRequest.updateMany({
      where: {
        id,
        OR: [
          { status: 'pending' },
          { status: 'verified' },
        ],
        version: current.version,
      },
      data: {
        status: 'rejected',
        rejectionReason: data.reason,
        kepalaDesaId: actorUserId,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictError('Concurrent modification detected');
    }

    await tx.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'LetterRequest',
        recordId: id,
        userId: actorUserId,
      },
    });
  });

  return letterRepo.findLetterRequestById(id);
}

export async function getLetterRequestById(id: string) {
  validateUUID(id);

  const request = await letterRepo.findLetterRequestById(id);
  if (!request) {
    throw new NotFoundError('Letter request not found');
  }

  return request;
}

export async function listLetterRequests(query: Record<string, unknown>) {
  const {
    page,
    limit,
    status,
    letterTypeId,
    residentId,
    operatorId,
    kepalaDesaId,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = letterRequestQuerySchema.parse(query);

  const skip = (page - 1) * limit;

  const where: Prisma.LetterRequestWhereInput = {};

  if (status) where.status = status;
  if (letterTypeId) where.letterTypeId = letterTypeId;
  if (residentId) where.residentId = residentId;
  if (operatorId) where.operatorId = operatorId;
  if (kepalaDesaId) where.kepalaDesaId = kepalaDesaId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const orderBy: Prisma.LetterRequestOrderByWithRelationInput = {
    [sortBy ?? 'createdAt']: sortOrder ?? 'desc',
  };

  const [data, total] = await Promise.all([
    letterRepo.findManyLetterRequests(skip, limit, where, orderBy),
    letterRepo.countLetterRequests(where),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
