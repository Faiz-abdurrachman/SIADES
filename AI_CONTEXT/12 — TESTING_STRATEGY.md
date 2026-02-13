# 12 — Testing Strategy

Testing is mandatory before production.

---

# Testing Stack
- **Framework**: Jest (ts-jest preset)
- **HTTP Testing**: Supertest
- **Coverage Thresholds**: branches 80%, functions 85%, lines 90%, statements 90%
- **Config**: jest.config.ts
- **Setup**: tests/setup.ts (truncate + safety check)

---

# Test Database Strategy

- Separate test database (DATABASE_URL must contain "test")
- Safety check: tests/setup.ts throws if DATABASE_URL doesn't include "test"
- Truncate ALL tables with CASCADE before EACH test
- Seed minimal required data inside each test (roles, users, families)
- Never use production DB for tests

Tables truncated:
```
AuditLog, DigitalSignature, Document, LetterRequest, LetterType,
PopulationEvent, Resident, Family, User, Role
```

---

# Implemented Test Suites

## 1. Resident Integration (tests/resident.integration.test.ts)
- Successful birth creation: verifies resident + event + audit in DB
- Transaction rollback: spies on `prisma.$transaction` to verify rollback behavior

## 2. Statistics Integration (tests/statistics.integration.test.ts)
- Creates residents via real API endpoints
- Adjusts event dates via `prisma.populationEvent.updateMany` (by residentId + eventType)
- Verifies yearly totals and monthly bucket aggregation

## 3. Security Integration (tests/security.integration.test.ts)
- Operator blocked from statistics → 403
- Kepala_desa blocked from delete → 403
- Unauthenticated request → 401

## 4. Conflict Integration (tests/conflict.integration.test.ts)
- Duplicate NIK on create → 409
- Duplicate NIK on update → 409

## 5. Soft Delete Integration (tests/soft-delete.integration.test.ts)
- Deleted resident returns 404 on GET
- Deleted resident excluded from list
- Deleted resident returns 404 on update
- Deleted resident still physically exists in DB with isActive=false

## 6. Concurrency Integration (tests/concurrency.integration.test.ts)
- Two parallel birth requests with same NIK via `Promise.allSettled`
- Expects one 201 + one 409
- Verifies single resident/event/audit in DB

---

# Test Patterns

## Authentication in Tests
Each test creates roles + user via Prisma, then calls `POST /api/auth/login` to get JWT token. Token is used in subsequent requests via `set('Authorization', 'Bearer ' + token)`.

## Data Setup
Tests create their own data (roles, users, families) inside `beforeAll` or at the start of the test. No shared fixtures across test files (clean truncate ensures isolation).

## Assertions
- HTTP status codes (201, 200, 400, 401, 403, 404, 409)
- Response body structure (`success`, `message`, `data`)
- Direct DB queries to verify side effects (audit logs, events, soft delete flags)

---

# CI/CD Integration

GitHub Actions workflow (`.github/workflows/ci.yml`):
- PostgreSQL 16 service container
- pg_isready wait loop before tests
- `npx prisma db push --skip-generate` for test schema
- `npm run test -- --coverage --forceExit --detectOpenHandles`

---

# Coverage Target

Configured in jest.config.ts:
- branches: 80%
- functions: 85%
- lines: 90%
- statements: 90%

Critical paths that must have coverage:
- Authentication (login success/failure)
- Resident creation (birth + move-in)
- Status transitions (life + domicile)
- Soft delete behavior
- Role-based access denial
- Duplicate/conflict handling
- Transaction rollback
