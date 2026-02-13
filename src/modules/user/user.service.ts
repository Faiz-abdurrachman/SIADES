import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import * as userRepo from './user.repository';
import {
  createUserSchema,
  updateUserSchema,
  paginationSchema,
  CreateUserInput,
  UpdateUserInput,
} from '../../validators/user.validator';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/appError';

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
    throw new ConflictError('User with this email already exists');
  }
  throw error;
}

export async function createUser(input: CreateUserInput, adminUserId: string) {
  const data = createUserSchema.parse(input);

  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role) {
    throw new NotFoundError('Role not found');
  }

  const existing = await userRepo.findByEmail(data.email);
  if (existing) {
    throw new ConflictError('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await userRepo.create(
        {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: { connect: { id: data.roleId } },
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          tableName: 'User',
          recordId: created.id,
          userId: adminUserId,
        },
      });

      return created;
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    handlePrismaError(error);
  }
}

export async function getUserById(id: string) {
  validateUUID(id);

  const user = await userRepo.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function listUsers(query: { page?: unknown; limit?: unknown }) {
  const { page, limit } = paginationSchema.parse(query);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    userRepo.findMany(skip, limit),
    userRepo.count(),
  ]);

  return {
    data: users.map(({ password: _, ...rest }) => rest),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateUser(id: string, input: UpdateUserInput, adminUserId: string) {
  validateUUID(id);

  const data = updateUserSchema.parse(input);

  const existing = await userRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  if (data.email && data.email !== existing.email) {
    const conflict = await userRepo.findByEmail(data.email);
    if (conflict) {
      throw new ConflictError('User with this email already exists');
    }
  }

  if (data.roleId) {
    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (id === adminUserId && role.name !== 'admin') {
      throw new ValidationError('You cannot change your own role');
    }
  }

  const { password: rawPassword, ...rest } = data;
  const updateData: Prisma.UserUpdateManyMutationInput = { ...rest };
  if (rawPassword) {
    updateData.password = await bcrypt.hash(rawPassword, 10);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await userRepo.update(id, updateData, tx);

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          tableName: 'User',
          recordId: id,
          userId: adminUserId,
        },
      });
    });
  } catch (error) {
    handlePrismaError(error);
  }

  const updated = await userRepo.findById(id);
  if (!updated) {
    throw new NotFoundError('User not found');
  }

  const { password: _, ...userWithoutPassword } = updated;
  return userWithoutPassword;
}

export async function deleteUser(id: string, adminUserId: string) {
  validateUUID(id);

  if (id === adminUserId) {
    throw new ValidationError('You cannot delete your own account');
  }

  const existing = await userRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  if (existing.role.name === 'admin') {
    const adminCount = await prisma.user.count({
      where: {
        role: { name: 'admin' },
        isActive: true,
      },
    });
    if (adminCount === 1) {
      throw new ValidationError('Cannot delete the last admin');
    }
  }

  await prisma.$transaction(async (tx) => {
    await userRepo.softDelete(id, tx);

    await tx.auditLog.create({
      data: {
        action: 'DELETE',
        tableName: 'User',
        recordId: id,
        userId: adminUserId,
      },
    });
  });
}
