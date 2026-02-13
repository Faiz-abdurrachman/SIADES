import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { env } from '../src/config/env';

describe('Resident Conflict Integration', () => {
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

  const residentPayload = (nik: string, fullName: string) => ({
    nik,
    fullName,
    birthPlace: 'Jakarta',
    birthDate: '2000-01-01',
    gender: 'male',
    religion: 'Islam',
    education: 'SMA',
    occupation: 'Pelajar',
    maritalStatus: 'single',
    domicileStatus: 'permanent',
  });

  it('should reject duplicate NIK on create', async () => {
    const nik = '3201010000000001';

    const first = await request(app)
      .post('/api/residents/birth')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...residentPayload(nik, 'Resident First'), familyId });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/residents/birth')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...residentPayload(nik, 'Resident Duplicate'), familyId });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.success).toBe(false);

    const residents = await prisma.resident.findMany({
      where: { nik },
    });
    expect(residents).toHaveLength(1);

    const events = await prisma.populationEvent.findMany({
      where: { residentId: first.body.data.id, eventType: 'birth' },
    });
    expect(events).toHaveLength(1);

    const audits = await prisma.auditLog.findMany({
      where: { recordId: first.body.data.id, action: 'CREATE', tableName: 'Resident' },
    });
    expect(audits).toHaveLength(1);
  });

  it('should reject duplicate NIK on update', async () => {
    const nikA = '3201010000000001';
    const nikB = '3201010000000002';

    const resA = await request(app)
      .post('/api/residents/birth')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...residentPayload(nikA, 'Resident A'), familyId });
    expect(resA.status).toBe(201);

    const resB = await request(app)
      .post('/api/residents/birth')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...residentPayload(nikB, 'Resident B'), familyId });
    expect(resB.status).toBe(201);

    const updateRes = await request(app)
      .put(`/api/residents/${resB.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nik: nikA });
    expect(updateRes.status).toBe(409);
    expect(updateRes.body.success).toBe(false);

    const residentB = await prisma.resident.findUnique({
      where: { id: resB.body.data.id },
    });
    expect(residentB!.nik).toBe(nikB);
  });
});
