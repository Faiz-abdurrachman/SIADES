import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import * as residentRepo from './resident.repository';
import * as familyRepo from '../family/family.repository';
import {
  createResidentSchema,
  updateResidentSchema,
  patchLifeStatusSchema,
  patchDomicileStatusSchema,
  paginationSchema,
  uuidSchema,
  CreateResidentInput,
  UpdateResidentInput,
  PatchLifeStatusInput,
  PatchDomicileStatusInput,
} from '../../validators/resident.validator';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/appError';

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
    throw new ConflictError('Resident with this NIK already exists');
  }
  throw error;
}

export async function createResident(input: CreateResidentInput, actorId: string) {
  const data = createResidentSchema.parse(input);

  const family = await familyRepo.findById(data.familyId);
  if (!family) {
    throw new NotFoundError('Family not found');
  }

  const existingNik = await residentRepo.findByNik(data.nik);
  if (existingNik) {
    throw new ConflictError('Resident with this NIK already exists');
  }

  try {
    const resident = await prisma.$transaction(async (tx) => {
      const created = await residentRepo.create(
        {
          nik: data.nik,
          fullName: data.fullName,
          birthPlace: data.birthPlace,
          birthDate: data.birthDate,
          gender: data.gender,
          religion: data.religion,
          education: data.education,
          occupation: data.occupation,
          maritalStatus: data.maritalStatus,
          lifeStatus: data.lifeStatus ?? 'alive',
          domicileStatus: data.domicileStatus,
          phone: data.phone,
          family: { connect: { id: data.familyId } },
        },
        tx
      );

      await tx.populationEvent.create({
        data: {
          eventType: 'birth',
          residentId: created.id,
          createdById: actorId,
          eventDate: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          tableName: 'Resident',
          recordId: created.id,
          userId: actorId,
        },
      });

      return created;
    });

    return resident;
  } catch (error) {
    handlePrismaError(error);
  }
}

export async function getResidentById(id: string) {
  validateUUID(id);

  const resident = await residentRepo.findById(id);
  if (!resident) {
    throw new NotFoundError('Resident not found');
  }

  return resident;
}

export async function listResidents(query: { page?: unknown; limit?: unknown }) {
  const { page, limit } = paginationSchema.parse(query);
  const skip = (page - 1) * limit;

  const [residents, total] = await Promise.all([
    residentRepo.findMany(skip, limit),
    residentRepo.count(),
  ]);

  return {
    data: residents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateResident(id: string, input: UpdateResidentInput, actorId: string) {
  validateUUID(id);

  const data = updateResidentSchema.parse(input);

  const existing = await residentRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Resident not found');
  }

  if (data.nik && data.nik !== existing.nik) {
    const conflict = await residentRepo.findByNik(data.nik);
    if (conflict) {
      throw new ConflictError('Resident with this NIK already exists');
    }
  }

  try {
    const { familyId, ...rest } = data;

    const updateData: Prisma.ResidentUpdateInput = { ...rest };
    if (familyId) {
      updateData.family = { connect: { id: familyId } };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await residentRepo.update(id, updateData, tx);

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          tableName: 'Resident',
          recordId: id,
          userId: actorId,
        },
      });

      return result;
    });

    return updated;
  } catch (error) {
    handlePrismaError(error);
  }
}

export async function patchLifeStatus(id: string, input: PatchLifeStatusInput, actorId: string) {
  validateUUID(id);

  const { lifeStatus } = patchLifeStatusSchema.parse(input);

  const existing = await residentRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Resident not found');
  }

  if (existing.lifeStatus === 'deceased') {
    throw new ConflictError('Resident is already deceased');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await residentRepo.updateLifeStatus(id, lifeStatus, tx);

    await tx.populationEvent.create({
      data: {
        eventType: 'death',
        residentId: id,
        createdById: actorId,
        eventDate: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'Resident',
        recordId: id,
        userId: actorId,
      },
    });

    return result;
  });

  return updated;
}

export async function patchDomicileStatus(id: string, input: PatchDomicileStatusInput, actorId: string) {
  validateUUID(id);

  const { domicileStatus } = patchDomicileStatusSchema.parse(input);

  const existing = await residentRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Resident not found');
  }

  if (existing.domicileStatus !== 'permanent') {
    throw new ConflictError('Only residents with permanent domicile status can be moved');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await residentRepo.updateDomicileStatus(id, domicileStatus, tx);

    await tx.populationEvent.create({
      data: {
        eventType: 'move_out',
        residentId: id,
        createdById: actorId,
        eventDate: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'Resident',
        recordId: id,
        userId: actorId,
      },
    });

    return result;
  });

  return updated;
}

export async function deleteResident(id: string, actorId: string) {
  validateUUID(id);

  const existing = await residentRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Resident not found');
  }

  await prisma.$transaction(async (tx) => {
    await residentRepo.softDelete(id, tx);

    await tx.auditLog.create({
      data: {
        action: 'DELETE',
        tableName: 'Resident',
        recordId: id,
        userId: actorId,
      },
    });
  });
}
