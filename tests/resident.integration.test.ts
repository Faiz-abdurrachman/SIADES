import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { env } from '../src/config/env';

describe('Resident Integration', () => {
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

  it('should create birth resident and generate event + audit', async () => {
    const res = await request(app)
      .post('/api/residents/birth')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nik: '3201012345678901',
        fullName: 'Test Resident',
        birthPlace: 'Jakarta',
        birthDate: '2000-01-15',
        gender: 'male',
        religion: 'Islam',
        education: 'SMA',
        occupation: 'Pelajar',
        maritalStatus: 'single',
        domicileStatus: 'permanent',
        familyId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();

    const residentId = res.body.data.id;

    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
    });
    expect(resident).not.toBeNull();
    expect(resident!.nik).toBe('3201012345678901');
    expect(resident!.lifeStatus).toBe('alive');
    expect(resident!.domicileStatus).toBe('permanent');

    const event = await prisma.populationEvent.findFirst({
      where: { residentId, eventType: 'birth' },
    });
    expect(event).not.toBeNull();
    expect(event!.residentId).toBe(residentId);

    const audit = await prisma.auditLog.findFirst({
      where: { recordId: residentId, action: 'CREATE', tableName: 'Resident' },
    });
    expect(audit).not.toBeNull();
    expect(audit!.recordId).toBe(residentId);
  });

  it('should rollback resident creation if transaction fails', async () => {
    const txSpy = jest.spyOn(prisma, '$transaction').mockImplementation(async () => {
      throw new Error('Forced transaction failure');
    });

    const testNik = '3201019999999999';

    const res = await request(app)
      .post('/api/residents/birth')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nik: testNik,
        fullName: 'Rollback Resident',
        birthPlace: 'Jakarta',
        birthDate: '2000-01-15',
        gender: 'male',
        religion: 'Islam',
        education: 'SMA',
        occupation: 'Pelajar',
        maritalStatus: 'single',
        domicileStatus: 'permanent',
        familyId,
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);

    txSpy.mockRestore();

    const resident = await prisma.resident.findFirst({
      where: { nik: testNik },
    });
    expect(resident).toBeNull();

    const event = await prisma.populationEvent.findFirst();
    expect(event).toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'CREATE', tableName: 'Resident' },
    });
    expect(audit).toBeNull();
  });
});
