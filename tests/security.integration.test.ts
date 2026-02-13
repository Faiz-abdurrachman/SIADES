import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { env } from '../src/config/env';

describe('Role Security Integration', () => {
  it('operator should NOT access statistics summary', async () => {
    const role = await prisma.role.create({
      data: { name: 'operator' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'operator_test',
        email: 'operator@siades.test',
        password: '$2b$10$placeholder_hashed_password',
        roleId: role.id,
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: role.name },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/statistics/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('kepala_desa should NOT delete resident', async () => {
    const adminRole = await prisma.role.create({
      data: { name: 'admin' },
    });

    const kepalaDesaRole = await prisma.role.create({
      data: { name: 'kepala_desa' },
    });

    const adminUser = await prisma.user.create({
      data: {
        name: 'admin_test',
        email: 'admin@siades.test',
        password: '$2b$10$placeholder_hashed_password',
        roleId: adminRole.id,
      },
    });

    const kepalaDesaUser = await prisma.user.create({
      data: {
        name: 'kepala_desa_test',
        email: 'kepaladesa@siades.test',
        password: '$2b$10$placeholder_hashed_password',
        roleId: kepalaDesaRole.id,
      },
    });

    const adminToken = jwt.sign(
      { userId: adminUser.id, role: adminRole.name },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const kepalaDesaToken = jwt.sign(
      { userId: kepalaDesaUser.id, role: kepalaDesaRole.name },
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

    const createRes = await request(app)
      .post('/api/residents/birth')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nik: '3201010000000001',
        fullName: 'Test Resident',
        birthPlace: 'Jakarta',
        birthDate: '2000-01-01',
        gender: 'male',
        religion: 'Islam',
        education: 'SMA',
        occupation: 'Pelajar',
        maritalStatus: 'single',
        domicileStatus: 'permanent',
        familyId: family.id,
      });
    expect(createRes.status).toBe(201);

    const residentId = createRes.body.data.id;

    const deleteRes = await request(app)
      .delete(`/api/residents/${residentId}`)
      .set('Authorization', `Bearer ${kepalaDesaToken}`);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.success).toBe(false);
  });

  it('unauthenticated request should return 401', async () => {
    const res = await request(app)
      .post('/api/residents/birth')
      .send({
        nik: '3201010000000001',
        fullName: 'Test Resident',
        birthPlace: 'Jakarta',
        birthDate: '2000-01-01',
        gender: 'male',
        religion: 'Islam',
        education: 'SMA',
        occupation: 'Pelajar',
        maritalStatus: 'single',
        domicileStatus: 'permanent',
        familyId: '00000000-0000-0000-0000-000000000000',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
