import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { env } from '../src/config/env';

describe('Resident Concurrency Integration', () => {
  let token: string;
  let familyId: string;

  beforeEach(async () => {
    const role = await prisma.role.create({
      data: { name: 'admin' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'admin_test',
        email: 'admin_test@siades.test',
        password: '$2b$10$placeholder_hashed_password',
        roleId: role.id,
      },
    });

    token = jwt.sign(
      { userId: user.id, role: role.name },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const family = await prisma.family.create({
      data: {
        noKK: '3201012345678901',
        alamat: 'Jl. Test No. 1',
        rt: '001',
        rw: '002',
        dusun: 'Dusun Test',
      },
    });

    familyId = family.id;
  });

  it('should handle concurrent duplicate NIK creation safely', async () => {
    const nik = '3201010000000001';

    const payload = {
      nik,
      fullName: 'Concurrent Resident',
      birthPlace: 'Jakarta',
      birthDate: '2000-01-01',
      gender: 'male',
      religion: 'Islam',
      education: 'SMA',
      occupation: 'Pelajar',
      maritalStatus: 'single',
      domicileStatus: 'permanent',
      familyId,
    };

    const [res1, res2] = await Promise.allSettled([
      request(app)
        .post('/api/residents/birth')
        .set('Authorization', `Bearer ${token}`)
        .send(payload),
      request(app)
        .post('/api/residents/birth')
        .set('Authorization', `Bearer ${token}`)
        .send(payload),
    ]);

    expect(res1.status).toBe('fulfilled');
    expect(res2.status).toBe('fulfilled');

    const statuses = [
      (res1 as PromiseFulfilledResult<request.Response>).value.status,
      (res2 as PromiseFulfilledResult<request.Response>).value.status,
    ].sort();

    expect(statuses).toEqual([201, 409]);

    const residents = await prisma.resident.findMany({
      where: { nik },
    });
    expect(residents).toHaveLength(1);

    const events = await prisma.populationEvent.findMany({
      where: { residentId: residents[0].id, eventType: 'birth' },
    });
    expect(events).toHaveLength(1);

    const audits = await prisma.auditLog.findMany({
      where: { recordId: residents[0].id, action: 'CREATE', tableName: 'Resident' },
    });
    expect(audits).toHaveLength(1);
  });
});
