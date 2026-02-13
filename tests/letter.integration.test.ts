import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { env } from '../src/config/env';

describe('Letter Module Integration', () => {
  let adminToken: string;
  let operatorToken: string;
  let kepalaDesaToken: string;
  let adminUserId: string;
  let operatorUserId: string;
  let kepalaDesaUserId: string;
  let residentId: string;
  let familyId: string;

  beforeEach(async () => {
    // ─── ROLES ───────────────────────────────────────────
    const adminRole = await prisma.role.create({ data: { name: 'admin' } });
    const operatorRole = await prisma.role.create({ data: { name: 'operator' } });
    const kepalaDesaRole = await prisma.role.create({ data: { name: 'kepala_desa' } });

    // ─── USERS ───────────────────────────────────────────
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin Test',
        email: 'admin@siades.test',
        password: hashedPassword,
        roleId: adminRole.id,
      },
    });

    const operatorUser = await prisma.user.create({
      data: {
        name: 'Operator Test',
        email: 'operator@siades.test',
        password: hashedPassword,
        roleId: operatorRole.id,
      },
    });

    const kepalaDesaUser = await prisma.user.create({
      data: {
        name: 'Kepala Desa Test',
        email: 'kepaladesa@siades.test',
        password: hashedPassword,
        roleId: kepalaDesaRole.id,
      },
    });

    adminUserId = adminUser.id;
    operatorUserId = operatorUser.id;
    kepalaDesaUserId = kepalaDesaUser.id;

    adminToken = jwt.sign(
      { userId: adminUser.id, role: adminRole.name },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    operatorToken = jwt.sign(
      { userId: operatorUser.id, role: operatorRole.name },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    kepalaDesaToken = jwt.sign(
      { userId: kepalaDesaUser.id, role: kepalaDesaRole.name },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ─── FAMILY + RESIDENT (prerequisite for LetterRequest) ──
    const family = await prisma.family.create({
      data: {
        noKK: '3301010101010001',
        alamat: 'Jl. Merdeka No. 1',
        rt: '001',
        rw: '001',
        dusun: 'Krajan',
      },
    });
    familyId = family.id;

    const resident = await prisma.resident.create({
      data: {
        nik: '3301010101010001',
        fullName: 'Budi Santoso',
        birthPlace: 'Semarang',
        birthDate: new Date('1990-01-15'),
        gender: 'male',
        religion: 'Islam',
        education: 'S1',
        occupation: 'Petani',
        maritalStatus: 'married',
        lifeStatus: 'alive',
        domicileStatus: 'permanent',
        familyId: family.id,
      },
    });
    residentId = resident.id;
  });

  // ─── HELPERS ─────────────────────────────────────────────

  async function createLetterType(name = 'Surat Keterangan Domisili') {
    const res = await request(app)
      .post('/api/letters/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, description: 'Surat keterangan tempat tinggal' });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  async function createLetterRequest(letterTypeId: string) {
    const res = await request(app)
      .post('/api/letters/requests')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        letterTypeId,
        residentId,
        purpose: 'Keperluan administrasi kependudukan',
      });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  async function verifyRequest(requestId: string) {
    const res = await request(app)
      .patch(`/api/letters/requests/${requestId}/verify`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(res.status).toBe(200);
    return res.body.data;
  }

  async function approveRequest(requestId: string) {
    const res = await request(app)
      .patch(`/api/letters/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${kepalaDesaToken}`);
    expect(res.status).toBe(200);
    return res.body.data;
  }

  async function rejectRequest(requestId: string, reason = 'Data tidak lengkap') {
    const res = await request(app)
      .patch(`/api/letters/requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${kepalaDesaToken}`)
      .send({ reason });
    expect(res.status).toBe(200);
    return res.body.data;
  }

  // ═══════════════════════════════════════════════════════════
  // 1️⃣ LETTER TYPE
  // ═══════════════════════════════════════════════════════════

  describe('LetterType CRUD', () => {
    describe('Create Letter Type', () => {
      it('should create letter type with audit log', async () => {
        const res = await request(app)
          .post('/api/letters/types')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Surat Keterangan Usaha', description: 'Untuk keperluan usaha' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Surat Keterangan Usaha');
        expect(res.body.data.description).toBe('Untuk keperluan usaha');
        expect(res.body.data.isActive).toBe(true);

        const letterTypeId = res.body.data.id;

        // Verify DB record
        const dbRecord = await prisma.letterType.findUnique({ where: { id: letterTypeId } });
        expect(dbRecord).not.toBeNull();
        expect(dbRecord!.name).toBe('Surat Keterangan Usaha');

        // Verify audit log
        const audit = await prisma.auditLog.findFirst({
          where: { recordId: letterTypeId, action: 'CREATE', tableName: 'LetterType' },
        });
        expect(audit).not.toBeNull();
        expect(audit!.userId).toBe(adminUserId);
      });

      it('should reject create with missing name', async () => {
        const res = await request(app)
          .post('/api/letters/types')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ description: 'No name provided' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject create with name too short', async () => {
        const res = await request(app)
          .post('/api/letters/types')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'AB' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });

    describe('Update Letter Type', () => {
      it('should update letter type and create audit log', async () => {
        const letterType = await createLetterType();

        const res = await request(app)
          .put(`/api/letters/types/${letterType.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Surat Keterangan Pindah' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Surat Keterangan Pindah');

        // Verify audit log
        const audit = await prisma.auditLog.findFirst({
          where: { recordId: letterType.id, action: 'UPDATE', tableName: 'LetterType' },
        });
        expect(audit).not.toBeNull();
        expect(audit!.userId).toBe(adminUserId);
      });

      it('should return 404 for non-existent letter type', async () => {
        const res = await request(app)
          .put('/api/letters/types/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Ghost Type' });

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });

    describe('Soft Delete Letter Type', () => {
      it('should soft delete letter type and create audit log', async () => {
        const letterType = await createLetterType();

        const res = await request(app)
          .delete(`/api/letters/types/${letterType.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify soft deleted in DB
        const dbRecord = await prisma.letterType.findUnique({ where: { id: letterType.id } });
        expect(dbRecord).not.toBeNull();
        expect(dbRecord!.isActive).toBe(false);

        // Verify audit log
        const audit = await prisma.auditLog.findFirst({
          where: { recordId: letterType.id, action: 'DELETE', tableName: 'LetterType' },
        });
        expect(audit).not.toBeNull();
        expect(audit!.userId).toBe(adminUserId);
      });

      it('should reject delete if used in approved request', async () => {
        const letterType = await createLetterType();
        const letterRequest = await createLetterRequest(letterType.id);
        await verifyRequest(letterRequest.id);
        await approveRequest(letterRequest.id);

        const res = await request(app)
          .delete(`/api/letters/types/${letterType.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);

        // Verify still active in DB
        const dbRecord = await prisma.letterType.findUnique({ where: { id: letterType.id } });
        expect(dbRecord!.isActive).toBe(true);
      });

      it('should allow delete if used only in non-approved requests', async () => {
        const letterType = await createLetterType();
        await createLetterRequest(letterType.id); // pending only

        const res = await request(app)
          .delete(`/api/letters/types/${letterType.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('List Letter Types', () => {
      it('should return paginated letter types', async () => {
        await createLetterType('Surat Keterangan Domisili');
        await createLetterType('Surat Keterangan Usaha');

        const res = await request(app)
          .get('/api/letters/types')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.pagination).toBeDefined();
        expect(res.body.data.pagination.total).toBe(2);
        expect(res.body.data.data.length).toBe(2);
      });

      it('should not include soft-deleted letter types', async () => {
        const letterType = await createLetterType();

        await request(app)
          .delete(`/api/letters/types/${letterType.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        const res = await request(app)
          .get('/api/letters/types')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.pagination.total).toBe(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 2️⃣ LETTER REQUEST LIFECYCLE
  // ═══════════════════════════════════════════════════════════

  describe('LetterRequest Lifecycle', () => {
    describe('Create Letter Request', () => {
      it('should create request with status pending and audit log', async () => {
        const letterType = await createLetterType();

        const res = await request(app)
          .post('/api/letters/requests')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({
            letterTypeId: letterType.id,
            residentId,
            purpose: 'Keperluan administrasi kependudukan',
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('pending');
        expect(res.body.data.operatorId).toBe(operatorUserId);

        const requestId = res.body.data.id;

        // Verify DB record
        const dbRecord = await prisma.letterRequest.findUnique({ where: { id: requestId } });
        expect(dbRecord).not.toBeNull();
        expect(dbRecord!.status).toBe('pending');
        expect(dbRecord!.letterTypeId).toBe(letterType.id);
        expect(dbRecord!.residentId).toBe(residentId);

        // Verify audit log
        const audit = await prisma.auditLog.findFirst({
          where: { recordId: requestId, action: 'CREATE', tableName: 'LetterRequest' },
        });
        expect(audit).not.toBeNull();
        expect(audit!.userId).toBe(operatorUserId);
      });

      it('should reject create with non-existent letter type', async () => {
        const res = await request(app)
          .post('/api/letters/requests')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({
            letterTypeId: '00000000-0000-0000-0000-000000000000',
            residentId,
            purpose: 'Keperluan administrasi kependudukan',
          });

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });

      it('should reject create with non-existent resident', async () => {
        const letterType = await createLetterType();

        const res = await request(app)
          .post('/api/letters/requests')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({
            letterTypeId: letterType.id,
            residentId: '00000000-0000-0000-0000-000000000000',
            purpose: 'Keperluan administrasi kependudukan',
          });

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });

      it('should reject create with missing purpose', async () => {
        const letterType = await createLetterType();

        const res = await request(app)
          .post('/api/letters/requests')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({
            letterTypeId: letterType.id,
            residentId,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });

    describe('Verify Letter Request', () => {
      it('should transition pending → verified with audit log and increment version', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);

        // version starts at 1
        const before = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
        expect(before!.version).toBe(1);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/verify`)
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('verified');

        // Verify DB
        const dbRecord = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
        expect(dbRecord!.status).toBe('verified');
        expect(dbRecord!.version).toBe(2);

        // Verify audit log
        const audit = await prisma.auditLog.findFirst({
          where: {
            recordId: letterReq.id,
            action: 'UPDATE',
            tableName: 'LetterRequest',
            userId: operatorUserId,
          },
        });
        expect(audit).not.toBeNull();
      });
    });

    describe('Approve Letter Request', () => {
      it('should transition verified → approved with audit log and increment version', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);
        await verifyRequest(letterReq.id);

        // version is 2 after verify
        const before = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
        expect(before!.version).toBe(2);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/approve`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('approved');

        // Verify DB
        const dbRecord = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
        expect(dbRecord!.status).toBe('approved');
        expect(dbRecord!.approvedAt).not.toBeNull();
        expect(dbRecord!.kepalaDesaId).toBe(kepalaDesaUserId);
        expect(dbRecord!.version).toBe(3);

        // Verify audit log
        const audit = await prisma.auditLog.findFirst({
          where: {
            recordId: letterReq.id,
            action: 'UPDATE',
            tableName: 'LetterRequest',
            userId: kepalaDesaUserId,
          },
        });
        expect(audit).not.toBeNull();
      });
    });

    describe('Reject Letter Request', () => {
      it('should reject from pending with reason and increment version', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);

        const before = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
        expect(before!.version).toBe(1);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/reject`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`)
          .send({ reason: 'Data penduduk tidak valid' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('rejected');

        // Verify DB
        const dbRecord = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
        expect(dbRecord!.status).toBe('rejected');
        expect(dbRecord!.rejectionReason).toBe('Data penduduk tidak valid');
        expect(dbRecord!.version).toBe(2);
      });

      it('should reject from verified with reason', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);
        await verifyRequest(letterReq.id);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/reject`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`)
          .send({ reason: 'Format surat tidak sesuai' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('rejected');

        const dbRecord = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
        expect(dbRecord!.rejectionReason).toBe('Format surat tidak sesuai');
      });

      it('should reject with missing reason → 400', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/reject`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`)
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });

    describe('Invalid State Transitions', () => {
      it('should reject verify after approved → 400', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);
        await verifyRequest(letterReq.id);
        await approveRequest(letterReq.id);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/verify`)
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject approve after rejected → 400', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);
        await verifyRequest(letterReq.id);
        await rejectRequest(letterReq.id);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/approve`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject reject after approved → 400', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);
        await verifyRequest(letterReq.id);
        await approveRequest(letterReq.id);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/reject`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`)
          .send({ reason: 'Terlambat menolak' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject approve from pending (must be verified first) → 400', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/approve`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 2.5 LETTER REQUEST FILTERING & SORTING
  // ═══════════════════════════════════════════════════════════

  describe('LetterRequest Filtering & Sorting', () => {
    describe('Filter by status', () => {
      it('should return only pending requests when status=pending', async () => {
        const letterType = await createLetterType();
        await createLetterRequest(letterType.id); // pending
        const req2 = await createLetterRequest(letterType.id);
        await verifyRequest(req2.id); // verified

        const res = await request(app)
          .get('/api/letters/requests?status=pending')
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.pagination.total).toBe(1);
        expect(res.body.data.data[0].status).toBe('pending');
      });

      it('should return only approved requests when status=approved', async () => {
        const letterType = await createLetterType();
        await createLetterRequest(letterType.id); // pending
        const req2 = await createLetterRequest(letterType.id);
        await verifyRequest(req2.id);
        await approveRequest(req2.id); // approved

        const res = await request(app)
          .get('/api/letters/requests?status=approved')
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.pagination.total).toBe(1);
        expect(res.body.data.data[0].status).toBe('approved');
      });

      it('should return empty when no requests match status', async () => {
        const letterType = await createLetterType();
        await createLetterRequest(letterType.id); // pending

        const res = await request(app)
          .get('/api/letters/requests?status=rejected')
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.pagination.total).toBe(0);
        expect(res.body.data.data.length).toBe(0);
      });
    });

    describe('Filter by letterTypeId', () => {
      it('should return only requests for specific letter type', async () => {
        const typeA = await createLetterType('Surat Domisili');
        const typeB = await createLetterType('Surat Usaha');
        await createLetterRequest(typeA.id);
        await createLetterRequest(typeA.id);
        await createLetterRequest(typeB.id);

        const res = await request(app)
          .get(`/api/letters/requests?letterTypeId=${typeA.id}`)
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.pagination.total).toBe(2);
        for (const item of res.body.data.data) {
          expect(item.letterTypeId).toBe(typeA.id);
        }
      });
    });

    describe('Filter by date range', () => {
      it('should return requests within date range', async () => {
        const letterType = await createLetterType();
        await createLetterRequest(letterType.id);
        await createLetterRequest(letterType.id);

        const now = new Date();
        const startDate = new Date(now.getTime() - 60_000).toISOString();
        const endDate = new Date(now.getTime() + 60_000).toISOString();

        const res = await request(app)
          .get(`/api/letters/requests?startDate=${startDate}&endDate=${endDate}`)
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.pagination.total).toBe(2);
      });

      it('should return empty for future date range', async () => {
        const letterType = await createLetterType();
        await createLetterRequest(letterType.id);

        const future = new Date(Date.now() + 86_400_000).toISOString();

        const res = await request(app)
          .get(`/api/letters/requests?startDate=${future}`)
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.pagination.total).toBe(0);
      });
    });

    describe('Sorting', () => {
      it('should sort by createdAt ascending', async () => {
        const letterType = await createLetterType();
        const reqA = await createLetterRequest(letterType.id);
        const reqB = await createLetterRequest(letterType.id);

        const res = await request(app)
          .get('/api/letters/requests?sortBy=createdAt&sortOrder=asc')
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.data.length).toBe(2);
        expect(res.body.data.data[0].id).toBe(reqA.id);
        expect(res.body.data.data[1].id).toBe(reqB.id);
      });

      it('should sort by createdAt descending (default)', async () => {
        const letterType = await createLetterType();
        const reqA = await createLetterRequest(letterType.id);
        const reqB = await createLetterRequest(letterType.id);

        const res = await request(app)
          .get('/api/letters/requests')
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.data[0].id).toBe(reqB.id);
        expect(res.body.data.data[1].id).toBe(reqA.id);
      });

      it('should sort by approvedAt descending', async () => {
        const letterType = await createLetterType();
        const reqA = await createLetterRequest(letterType.id);
        await verifyRequest(reqA.id);
        await approveRequest(reqA.id);

        const reqB = await createLetterRequest(letterType.id);
        await verifyRequest(reqB.id);
        await approveRequest(reqB.id);

        const res = await request(app)
          .get('/api/letters/requests?sortBy=approvedAt&sortOrder=desc')
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.data[0].id).toBe(reqB.id);
        expect(res.body.data.data[1].id).toBe(reqA.id);
      });
    });

    describe('Combined filters', () => {
      it('should filter by status and letterTypeId together', async () => {
        const typeA = await createLetterType('Surat Domisili');
        const typeB = await createLetterType('Surat Usaha');
        await createLetterRequest(typeA.id); // pending, typeA
        const req2 = await createLetterRequest(typeA.id);
        await verifyRequest(req2.id); // verified, typeA
        await createLetterRequest(typeB.id); // pending, typeB

        const res = await request(app)
          .get(`/api/letters/requests?status=pending&letterTypeId=${typeA.id}`)
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.pagination.total).toBe(1);
        expect(res.body.data.data[0].status).toBe('pending');
        expect(res.body.data.data[0].letterTypeId).toBe(typeA.id);
      });
    });

    describe('Validation', () => {
      it('should reject invalid status value', async () => {
        const res = await request(app)
          .get('/api/letters/requests?status=invalid')
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject invalid sortBy value', async () => {
        const res = await request(app)
          .get('/api/letters/requests?sortBy=invalidField')
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject invalid UUID for letterTypeId', async () => {
        const res = await request(app)
          .get('/api/letters/requests?letterTypeId=not-a-uuid')
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 3️⃣ DIGITAL SIGNATURE
  // ═══════════════════════════════════════════════════════════

  describe('DigitalSignature', () => {
    it('should create digital signature automatically on approve', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await verifyRequest(letterReq.id);
      await approveRequest(letterReq.id);

      const signature = await prisma.digitalSignature.findUnique({
        where: { letterRequestId: letterReq.id },
      });

      expect(signature).not.toBeNull();
      expect(signature!.letterRequestId).toBe(letterReq.id);
      expect(signature!.signatureImagePath).toBeDefined();
      expect(signature!.documentHash).toBeDefined();
      expect(signature!.qrCodePath).toBeDefined();
    });

    it('should be correctly linked to letter request via API response', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await verifyRequest(letterReq.id);
      await approveRequest(letterReq.id);

      const res = await request(app)
        .get(`/api/letters/requests/${letterReq.id}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.signature).not.toBeNull();
      expect(res.body.data.signature.letterRequestId).toBe(letterReq.id);
    });

    it('should create only one signature per letter request', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await verifyRequest(letterReq.id);
      await approveRequest(letterReq.id);

      const signatureCount = await prisma.digitalSignature.count({
        where: { letterRequestId: letterReq.id },
      });

      expect(signatureCount).toBe(1);
    });

    it('should not create signature for non-approved requests', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await verifyRequest(letterReq.id);

      const signature = await prisma.digitalSignature.findUnique({
        where: { letterRequestId: letterReq.id },
      });

      expect(signature).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 4️⃣ IMMUTABLE ENFORCEMENT
  // ═══════════════════════════════════════════════════════════

  describe('Immutable Enforcement', () => {
    it('approved request cannot be verified', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await verifyRequest(letterReq.id);
      await approveRequest(letterReq.id);

      const res = await request(app)
        .patch(`/api/letters/requests/${letterReq.id}/verify`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(400);

      // Status unchanged in DB
      const dbRecord = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
      expect(dbRecord!.status).toBe('approved');
    });

    it('approved request cannot be rejected', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await verifyRequest(letterReq.id);
      await approveRequest(letterReq.id);

      const res = await request(app)
        .patch(`/api/letters/requests/${letterReq.id}/reject`)
        .set('Authorization', `Bearer ${kepalaDesaToken}`)
        .send({ reason: 'Tidak bisa ditolak' });

      expect(res.status).toBe(400);

      const dbRecord = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
      expect(dbRecord!.status).toBe('approved');
    });

    it('approved request cannot be approved again', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await verifyRequest(letterReq.id);
      await approveRequest(letterReq.id);

      const res = await request(app)
        .patch(`/api/letters/requests/${letterReq.id}/approve`)
        .set('Authorization', `Bearer ${kepalaDesaToken}`);

      expect(res.status).toBe(400);
    });

    it('rejected request cannot be verified', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await rejectRequest(letterReq.id);

      const res = await request(app)
        .patch(`/api/letters/requests/${letterReq.id}/verify`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(400);

      const dbRecord = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
      expect(dbRecord!.status).toBe('rejected');
    });

    it('rejected request cannot be approved', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await rejectRequest(letterReq.id);

      const res = await request(app)
        .patch(`/api/letters/requests/${letterReq.id}/approve`)
        .set('Authorization', `Bearer ${kepalaDesaToken}`);

      expect(res.status).toBe(400);

      const dbRecord = await prisma.letterRequest.findUnique({ where: { id: letterReq.id } });
      expect(dbRecord!.status).toBe('rejected');
    });

    it('rejected request cannot be rejected again', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await rejectRequest(letterReq.id);

      const res = await request(app)
        .patch(`/api/letters/requests/${letterReq.id}/reject`)
        .set('Authorization', `Bearer ${kepalaDesaToken}`)
        .send({ reason: 'Tolak lagi' });

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 5️⃣ AUDIT LOG
  // ═══════════════════════════════════════════════════════════

  describe('Audit Log Verification', () => {
    it('should create audit log for full letter request lifecycle', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await verifyRequest(letterReq.id);
      await approveRequest(letterReq.id);

      // CREATE LetterType
      const createTypeAudit = await prisma.auditLog.findFirst({
        where: { action: 'CREATE', tableName: 'LetterType', recordId: letterType.id },
      });
      expect(createTypeAudit).not.toBeNull();
      expect(createTypeAudit!.userId).toBe(adminUserId);

      // CREATE LetterRequest
      const createReqAudit = await prisma.auditLog.findFirst({
        where: { action: 'CREATE', tableName: 'LetterRequest', recordId: letterReq.id },
      });
      expect(createReqAudit).not.toBeNull();
      expect(createReqAudit!.userId).toBe(operatorUserId);

      // VERIFY (UPDATE by operator)
      const verifyAudit = await prisma.auditLog.findFirst({
        where: {
          action: 'UPDATE',
          tableName: 'LetterRequest',
          recordId: letterReq.id,
          userId: operatorUserId,
        },
      });
      expect(verifyAudit).not.toBeNull();

      // APPROVE (UPDATE by kepala_desa)
      const approveAudit = await prisma.auditLog.findFirst({
        where: {
          action: 'UPDATE',
          tableName: 'LetterRequest',
          recordId: letterReq.id,
          userId: kepalaDesaUserId,
        },
      });
      expect(approveAudit).not.toBeNull();
    });

    it('should create audit log for reject action', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await rejectRequest(letterReq.id);

      const rejectAudit = await prisma.auditLog.findFirst({
        where: {
          action: 'UPDATE',
          tableName: 'LetterRequest',
          recordId: letterReq.id,
          userId: kepalaDesaUserId,
        },
      });
      expect(rejectAudit).not.toBeNull();
    });

    it('should create audit log for letter type update', async () => {
      const letterType = await createLetterType();

      await request(app)
        .put(`/api/letters/types/${letterType.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'UPDATE', tableName: 'LetterType', recordId: letterType.id },
      });
      expect(audit).not.toBeNull();
      expect(audit!.userId).toBe(adminUserId);
    });

    it('should create audit log for letter type delete', async () => {
      const letterType = await createLetterType();

      await request(app)
        .delete(`/api/letters/types/${letterType.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'DELETE', tableName: 'LetterType', recordId: letterType.id },
      });
      expect(audit).not.toBeNull();
      expect(audit!.userId).toBe(adminUserId);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 7️⃣ CONCURRENCY STRESS TEST
  // ═══════════════════════════════════════════════════════════

  describe('Concurrency Stress Test', () => {
    it('should allow only one approve under concurrent requests', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await verifyRequest(letterReq.id);

      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app)
          .patch(`/api/letters/requests/${letterReq.id}/approve`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`)
      );

      const results = await Promise.allSettled(concurrentRequests);

      const responses = results.map((r) => {
        if (r.status === 'fulfilled') return r.value;
        throw new Error('Request failed unexpectedly');
      });

      const successes = responses.filter((r) => r.status === 200);
      const failures = responses.filter((r) => r.status === 400);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(9);

      // Verify exactly 1 DigitalSignature
      const signatureCount = await prisma.digitalSignature.count({
        where: { letterRequestId: letterReq.id },
      });
      expect(signatureCount).toBe(1);

      // Verify final DB status
      const dbRecord = await prisma.letterRequest.findUnique({
        where: { id: letterReq.id },
      });
      expect(dbRecord!.status).toBe('approved');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 8️⃣ APPROVE VS REJECT RACE CONDITION
  // ═══════════════════════════════════════════════════════════

  describe('Approve vs Reject Race Condition', () => {
    it('should allow exactly one winner when approve and reject race concurrently', async () => {
      const letterType = await createLetterType();
      const letterReq = await createLetterRequest(letterType.id);
      await verifyRequest(letterReq.id);

      const approveRequests = Array.from({ length: 5 }, () =>
        request(app)
          .patch(`/api/letters/requests/${letterReq.id}/approve`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`)
      );

      const rejectRequests = Array.from({ length: 5 }, () =>
        request(app)
          .patch(`/api/letters/requests/${letterReq.id}/reject`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`)
          .send({ reason: 'Dokumen tidak sesuai prosedur' })
      );

      const results = await Promise.allSettled([...approveRequests, ...rejectRequests]);

      const responses = results.map((r) => {
        if (r.status === 'fulfilled') return r.value;
        throw new Error('Request failed unexpectedly');
      });

      const successes = responses.filter((r) => r.status === 200);
      const failures = responses.filter((r) => r.status === 400);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(9);

      // Verify final DB status is exactly one terminal state
      const dbRecord = await prisma.letterRequest.findUnique({
        where: { id: letterReq.id },
      });
      expect(['approved', 'rejected']).toContain(dbRecord!.status);

      const signatureCount = await prisma.digitalSignature.count({
        where: { letterRequestId: letterReq.id },
      });

      if (dbRecord!.status === 'approved') {
        expect(signatureCount).toBe(1);
      } else {
        expect(signatureCount).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 6️⃣ ROLE ENFORCEMENT
  // ═══════════════════════════════════════════════════════════

  describe('Role Enforcement', () => {
    describe('LetterType - Admin Only', () => {
      it('operator cannot create letter type → 403', async () => {
        const res = await request(app)
          .post('/api/letters/types')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ name: 'Surat Blocked' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });

      it('kepala_desa cannot create letter type → 403', async () => {
        const res = await request(app)
          .post('/api/letters/types')
          .set('Authorization', `Bearer ${kepalaDesaToken}`)
          .send({ name: 'Surat Blocked' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });

      it('operator cannot update letter type → 403', async () => {
        const letterType = await createLetterType();

        const res = await request(app)
          .put(`/api/letters/types/${letterType.id}`)
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ name: 'Hacked Name' });

        expect(res.status).toBe(403);
      });

      it('operator cannot delete letter type → 403', async () => {
        const letterType = await createLetterType();

        const res = await request(app)
          .delete(`/api/letters/types/${letterType.id}`)
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('LetterRequest - Operator Creates/Verifies', () => {
      it('admin cannot create letter request → 403', async () => {
        const letterType = await createLetterType();

        const res = await request(app)
          .post('/api/letters/requests')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            letterTypeId: letterType.id,
            residentId,
            purpose: 'Blocked request',
          });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });

      it('kepala_desa cannot create letter request → 403', async () => {
        const letterType = await createLetterType();

        const res = await request(app)
          .post('/api/letters/requests')
          .set('Authorization', `Bearer ${kepalaDesaToken}`)
          .send({
            letterTypeId: letterType.id,
            residentId,
            purpose: 'Blocked request',
          });

        expect(res.status).toBe(403);
      });

      it('admin cannot verify letter request → 403', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/verify`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
      });

      it('kepala_desa cannot verify letter request → 403', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/verify`)
          .set('Authorization', `Bearer ${kepalaDesaToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('LetterRequest - Kepala Desa Approves', () => {
      it('admin cannot approve letter request → 403', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);
        await verifyRequest(letterReq.id);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
      });

      it('operator cannot approve letter request → 403', async () => {
        const letterType = await createLetterType();
        const letterReq = await createLetterRequest(letterType.id);
        await verifyRequest(letterReq.id);

        const res = await request(app)
          .patch(`/api/letters/requests/${letterReq.id}/approve`)
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('Unauthenticated Access', () => {
      it('should return 401 for letter types without token', async () => {
        const res = await request(app).get('/api/letters/types');

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });

      it('should return 401 for letter requests without token', async () => {
        const res = await request(app).get('/api/letters/requests');

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });

      it('should return 401 for create letter type without token', async () => {
        const res = await request(app)
          .post('/api/letters/types')
          .send({ name: 'Surat Blocked' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });

      it('should return 401 for create letter request without token', async () => {
        const res = await request(app)
          .post('/api/letters/requests')
          .send({
            letterTypeId: '00000000-0000-0000-0000-000000000000',
            residentId: '00000000-0000-0000-0000-000000000000',
            purpose: 'Blocked',
          });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });

      it('should return 401 for approve without token', async () => {
        const res = await request(app)
          .patch('/api/letters/requests/00000000-0000-0000-0000-000000000000/approve');

        expect(res.status).toBe(401);
      });

      it('should return 401 with invalid token', async () => {
        const res = await request(app)
          .get('/api/letters/types')
          .set('Authorization', 'Bearer invalidtoken123');

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });
    });
  });
});
