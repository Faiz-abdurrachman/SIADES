import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { env } from '../src/config/env';

describe('Statistics Integration', () => {
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

  it('should correctly aggregate yearly and monthly statistics', async () => {
    // 1. Create birth resident (January 2025)
    const birth1 = await request(app)
      .post('/api/residents/birth')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nik: '3201010000000001',
        fullName: 'Resident January',
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
    expect(birth1.status).toBe(201);
    const resident1Id = birth1.body.data.id;

    // 2. Create birth resident (February 2025)
    const birth2 = await request(app)
      .post('/api/residents/birth')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nik: '3201010000000002',
        fullName: 'Resident February',
        birthPlace: 'Bandung',
        birthDate: '2000-02-01',
        gender: 'female',
        religion: 'Islam',
        education: 'SMA',
        occupation: 'Pelajar',
        maritalStatus: 'single',
        domicileStatus: 'permanent',
        familyId,
      });
    expect(birth2.status).toBe(201);
    const resident2Id = birth2.body.data.id;

    // 3. Patch February resident life-status to deceased
    const deathRes = await request(app)
      .patch(`/api/residents/${resident2Id}/life-status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lifeStatus: 'deceased' });
    expect(deathRes.status).toBe(200);

    // 4. Create move-in resident (March 2025)
    const moveIn = await request(app)
      .post('/api/residents/move-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nik: '3201010000000003',
        fullName: 'Resident March',
        birthPlace: 'Surabaya',
        birthDate: '1995-06-15',
        gender: 'male',
        religion: 'Islam',
        education: 'S1',
        occupation: 'Karyawan',
        maritalStatus: 'married',
        domicileStatus: 'permanent',
        familyId,
      });
    expect(moveIn.status).toBe(201);
    const resident3Id = moveIn.body.data.id;

    // 5. Patch March resident domicile-status to moved
    const moveOutRes = await request(app)
      .patch(`/api/residents/${resident3Id}/domicile-status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ domicileStatus: 'moved' });
    expect(moveOutRes.status).toBe(200);

    // 6. Adjust event dates to 2025 months using deterministic updateMany
    await prisma.populationEvent.updateMany({
      where: { residentId: resident1Id, eventType: 'birth' },
      data: { eventDate: new Date(2025, 0, 15) },
    });

    await prisma.populationEvent.updateMany({
      where: { residentId: resident2Id, eventType: 'birth' },
      data: { eventDate: new Date(2025, 1, 10) },
    });

    await prisma.populationEvent.updateMany({
      where: { residentId: resident2Id, eventType: 'death' },
      data: { eventDate: new Date(2025, 1, 20) },
    });

    await prisma.populationEvent.updateMany({
      where: { residentId: resident3Id, eventType: 'move_in' },
      data: { eventDate: new Date(2025, 2, 5) },
    });

    await prisma.populationEvent.updateMany({
      where: { residentId: resident3Id, eventType: 'move_out' },
      data: { eventDate: new Date(2025, 2, 25) },
    });

    // 7. Call statistics endpoint
    const res = await request(app)
      .get('/api/statistics/summary?year=2025')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { totals, monthly } = res.body.data;

    // 8. Assert totals
    expect(totals.birth).toBe(2);
    expect(totals.death).toBe(1);
    expect(totals.move_in).toBe(1);
    expect(totals.move_out).toBe(1);

    // 9. Assert monthly
    // January (index 0)
    expect(monthly[0].month).toBe(1);
    expect(monthly[0].birth).toBe(1);
    expect(monthly[0].death).toBe(0);
    expect(monthly[0].move_in).toBe(0);
    expect(monthly[0].move_out).toBe(0);

    // February (index 1)
    expect(monthly[1].month).toBe(2);
    expect(monthly[1].birth).toBe(1);
    expect(monthly[1].death).toBe(1);
    expect(monthly[1].move_in).toBe(0);
    expect(monthly[1].move_out).toBe(0);

    // March (index 2)
    expect(monthly[2].month).toBe(3);
    expect(monthly[2].birth).toBe(0);
    expect(monthly[2].death).toBe(0);
    expect(monthly[2].move_in).toBe(1);
    expect(monthly[2].move_out).toBe(1);

    // All other months should be zero
    for (let i = 3; i < 12; i++) {
      expect(monthly[i].month).toBe(i + 1);
      expect(monthly[i].birth).toBe(0);
      expect(monthly[i].death).toBe(0);
      expect(monthly[i].move_in).toBe(0);
      expect(monthly[i].move_out).toBe(0);
    }
  });
});
