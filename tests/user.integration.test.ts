import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { env } from '../src/config/env';

describe('User Module Integration', () => {
  let adminToken: string;
  let adminUserId: string;
  let operatorRoleId: string;

  beforeEach(async () => {
    const adminRole = await prisma.role.create({
      data: { name: 'admin' },
    });

    const operatorRole = await prisma.role.create({
      data: { name: 'operator' },
    });

    await prisma.role.create({
      data: { name: 'kepala_desa' },
    });

    operatorRoleId = operatorRole.id;

    const adminUser = await prisma.user.create({
      data: {
        name: 'admin_test',
        email: 'admin_test@siades.test',
        password: await bcrypt.hash('admin123', 10),
        roleId: adminRole.id,
      },
    });

    adminUserId = adminUser.id;

    adminToken = jwt.sign(
      { userId: adminUser.id, role: adminRole.name },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  const userPayload = (email: string) => ({
    name: 'New User',
    email,
    password: 'password123',
    roleId: '', // must be set per test
  });

  // ─── CRUD ────────────────────────────────────────────────

  describe('Create User', () => {
    it('should create user with audit log and exclude password from response', async () => {
      const payload = { ...userPayload('newuser@siades.test'), roleId: operatorRoleId };

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe('newuser@siades.test');
      expect(res.body.data.name).toBe('New User');
      expect(res.body.data.password).toBeUndefined();

      const userId = res.body.data.id;

      // Verify user in DB with hashed password
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.email).toBe('newuser@siades.test');
      expect(dbUser!.isActive).toBe(true);
      const passwordMatch = await bcrypt.compare('password123', dbUser!.password);
      expect(passwordMatch).toBe(true);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { recordId: userId, action: 'CREATE', tableName: 'User' },
      });
      expect(audit).not.toBeNull();
      expect(audit!.userId).toBe(adminUserId);
    });
  });

  describe('Get User By ID', () => {
    it('should retrieve user with role and exclude password', async () => {
      const payload = { ...userPayload('getuser@siades.test'), roleId: operatorRoleId };

      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      expect(createRes.status).toBe(201);

      const userId = createRes.body.data.id;

      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.email).toBe('getuser@siades.test');
      expect(res.body.data.role).toBeDefined();
      expect(res.body.data.role.name).toBe('operator');
      expect(res.body.data.password).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/users/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('List Users', () => {
    it('should return paginated users without passwords', async () => {
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload('list1@siades.test'), roleId: operatorRoleId });

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload('list2@siades.test'), roleId: operatorRoleId });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.total).toBe(3); // admin + 2 created
      expect(res.body.data.data.length).toBe(3);

      // Verify no password in any entry
      for (const user of res.body.data.data) {
        expect(user.password).toBeUndefined();
      }
    });

    it('should respect pagination parameters', async () => {
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload('page1@siades.test'), roleId: operatorRoleId });

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload('page2@siades.test'), roleId: operatorRoleId });

      const res = await request(app)
        .get('/api/users?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBe(1);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(1);
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.pagination.totalPages).toBe(3);
    });
  });

  describe('Update User', () => {
    it('should update user name and create audit log', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload('update@siades.test'), roleId: operatorRoleId });
      expect(createRes.status).toBe(201);

      const userId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.password).toBeUndefined();

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { recordId: userId, action: 'UPDATE', tableName: 'User' },
      });
      expect(audit).not.toBeNull();
      expect(audit!.userId).toBe(adminUserId);
    });

    it('should hash password when updated', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload('pwupdate@siades.test'), roleId: operatorRoleId });
      expect(createRes.status).toBe(201);

      const userId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'newpassword123' });

      expect(res.status).toBe(200);

      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      const match = await bcrypt.compare('newpassword123', dbUser!.password);
      expect(match).toBe(true);
    });

    it('should return 404 for non-existent user on update', async () => {
      const res = await request(app)
        .put('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should validate role exists when roleId provided on update', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload('rolecheck@siades.test'), roleId: operatorRoleId });
      expect(createRes.status).toBe(201);

      const userId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Delete User', () => {
    it('should soft delete user and create audit log', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload('delete@siades.test'), roleId: operatorRoleId });
      expect(createRes.status).toBe(201);

      const userId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { recordId: userId, action: 'DELETE', tableName: 'User' },
      });
      expect(audit).not.toBeNull();
      expect(audit!.userId).toBe(adminUserId);
    });

    it('should return 404 for non-existent user on delete', async () => {
      const res = await request(app)
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── SOFT DELETE BEHAVIOR ────────────────────────────────

  describe('Soft Delete Behavior', () => {
    async function createAndDeleteUser(email: string): Promise<string> {
      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload(email), roleId: operatorRoleId });
      expect(createRes.status).toBe(201);

      const userId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(200);

      return userId;
    }

    it('deleted user should return 404 on GET', async () => {
      const userId = await createAndDeleteUser('softget@siades.test');

      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('deleted user should not appear in list', async () => {
      const userId = await createAndDeleteUser('softlist@siades.test');

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const ids = res.body.data.data.map((u: { id: string }) => u.id);
      expect(ids).not.toContain(userId);
    });

    it('deleted user should not be updatable', async () => {
      const userId = await createAndDeleteUser('softupdate@siades.test');

      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Ghost' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('soft delete should not physically remove record', async () => {
      const userId = await createAndDeleteUser('softphysical@siades.test');

      const record = await prisma.user.findUnique({ where: { id: userId } });

      expect(record).not.toBeNull();
      expect(record!.isActive).toBe(false);
      expect(record!.deletedAt).not.toBeNull();
    });
  });

  // ─── CONFLICT (DUPLICATE EMAIL) ─────────────────────────

  describe('Conflict - Duplicate Email', () => {
    it('should reject duplicate email on create', async () => {
      const payload = { ...userPayload('dup@siades.test'), roleId: operatorRoleId };

      const first = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      expect(first.status).toBe(201);

      const duplicate = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.success).toBe(false);
    });

    it('should reject duplicate email on update', async () => {
      const resA = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload('usera@siades.test'), roleId: operatorRoleId });
      expect(resA.status).toBe(201);

      const resB = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...userPayload('userb@siades.test'), roleId: operatorRoleId });
      expect(resB.status).toBe(201);

      const updateRes = await request(app)
        .put(`/api/users/${resB.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'usera@siades.test' });

      expect(updateRes.status).toBe(409);
      expect(updateRes.body.success).toBe(false);
    });
  });

  // ─── SECURITY (ROLE-BASED ACCESS) ───────────────────────

  describe('Security - Role Enforcement', () => {
    it('operator should be denied access to user endpoints', async () => {
      const operatorRole = await prisma.role.findFirst({ where: { name: 'operator' } });

      const operatorUser = await prisma.user.create({
        data: {
          name: 'operator_test',
          email: 'operator@siades.test',
          password: '$2b$10$placeholder_hashed_password',
          roleId: operatorRole!.id,
        },
      });

      const operatorToken = jwt.sign(
        { userId: operatorUser.id, role: 'operator' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ ...userPayload('blocked@siades.test'), roleId: operatorRole!.id });
      expect(createRes.status).toBe(403);

      const listRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(listRes.status).toBe(403);

      const getRes = await request(app)
        .get(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(getRes.status).toBe(403);

      const updateRes = await request(app)
        .put(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ name: 'Hacked' });
      expect(updateRes.status).toBe(403);

      const deleteRes = await request(app)
        .delete(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(deleteRes.status).toBe(403);
    });

    it('kepala_desa should be denied access to user endpoints', async () => {
      const kepalaDesaRole = await prisma.role.findFirst({ where: { name: 'kepala_desa' } });

      const kepalaDesaUser = await prisma.user.create({
        data: {
          name: 'kepaladesa_test',
          email: 'kepaladesa@siades.test',
          password: '$2b$10$placeholder_hashed_password',
          roleId: kepalaDesaRole!.id,
        },
      });

      const kepalaDesaToken = jwt.sign(
        { userId: kepalaDesaUser.id, role: 'kepala_desa' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const listRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${kepalaDesaToken}`);
      expect(listRes.status).toBe(403);

      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${kepalaDesaToken}`)
        .send({ ...userPayload('blocked2@siades.test'), roleId: kepalaDesaRole!.id });
      expect(createRes.status).toBe(403);
    });

    it('unauthenticated request should return 401', async () => {
      const res = await request(app)
        .get('/api/users');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── VALIDATION ──────────────────────────────────────────

  describe('Validation', () => {
    it('should reject create with invalid role ID (non-existent)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test User',
          email: 'valid@siades.test',
          password: 'password123',
          roleId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject create with invalid input fields', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'A',                  // too short (min 2)
          email: 'not-an-email',      // invalid email
          password: 'short',          // too short (min 8)
          roleId: 'not-a-uuid',       // invalid UUID
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject create with extra fields (strict mode)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test User',
          email: 'strict@siades.test',
          password: 'password123',
          roleId: operatorRoleId,
          isAdmin: true,              // extra field
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── TRANSACTION ROLLBACK ────────────────────────────────

  describe('Transaction Rollback', () => {
    it('should rollback user creation if transaction fails', async () => {
      const txSpy = jest.spyOn(prisma, '$transaction').mockImplementation(async () => {
        throw new Error('Forced transaction failure');
      });

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Rollback User',
          email: 'rollback@siades.test',
          password: 'password123',
          roleId: operatorRoleId,
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);

      txSpy.mockRestore();

      // Verify no user was created
      const user = await prisma.user.findFirst({
        where: { email: 'rollback@siades.test' },
      });
      expect(user).toBeNull();

      // Verify no audit log was created
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'CREATE', tableName: 'User' },
      });
      expect(audit).toBeNull();
    });
  });
});
