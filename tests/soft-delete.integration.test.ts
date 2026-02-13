import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { env } from '../src/config/env';

describe('Resident Soft Delete Integration', () => {
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

  async function createResident(nik: string) {
    const res = await request(app)
      .post('/api/residents/birth')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nik,
        fullName: 'Test Resident',
        birthPlace: 'Jakarta',
        birthDate: '2000-01-01',
        gender: 'male',
        religion: 'Islam',
        education: 'SMA',
        occupation: 'Pelajar',
        maritalStatus: 'single',
        domicileStatus: 'permanent',
        familyId,
      });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  async function deleteResident(id: string) {
    const res = await request(app)
      .delete(`/api/residents/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  }

  it('deleted resident should return 404 on GET', async () => {
    const id = await createResident('3201010000000001');
    await deleteResident(id);

    const res = await request(app)
      .get(`/api/residents/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('deleted resident should not appear in list', async () => {
    const id = await createResident('3201010000000002');
    await deleteResident(id);

    const res = await request(app)
      .get('/api/residents')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const ids = res.body.data.data.map((r: { id: string }) => r.id);
    expect(ids).not.toContain(id);
  });

  it('deleted resident should not be updatable', async () => {
    const id = await createResident('3201010000000003');
    await deleteResident(id);

    const res = await request(app)
      .put(`/api/residents/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Updated Name' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('soft delete should not physically remove record', async () => {
    const id = await createResident('3201010000000004');
    await deleteResident(id);

    const record = await prisma.resident.findUnique({
      where: { id },
    });

    expect(record).not.toBeNull();
    expect(record!.isActive).toBe(false);
    expect(record!.deletedAt).not.toBeNull();
  });
});
