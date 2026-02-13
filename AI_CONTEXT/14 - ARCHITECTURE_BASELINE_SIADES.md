# ARCHITECTURE BASELINE — SIADes

> This is the single-source-of-truth document for transferring full project context to a new AI session.
> The AI receiving this document must confirm understanding of ALL sections before writing any code.

---

# 1. PROJECT IDENTITY

**Project Name:** SIADes — Sistem Informasi Administrasi Kependudukan Desa

**Type:** Production-grade village population administration backend.

**Stack (LOCKED — do not change):**

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20 |
| Framework | Express.js | ^4.18 |
| Language | TypeScript | ^5.3 (strict mode) |
| ORM | Prisma | ^5.0 |
| Database | PostgreSQL | 16 |
| Auth | jsonwebtoken | ^9.0 |
| Hashing | bcrypt | ^5.1 |
| Validation | Zod | ^3.22 |
| Testing | Jest + Supertest | ^30 / ^7 |
| CI/CD | GitHub Actions | — |
| Container | Docker (multi-stage) | node:20-alpine |

**Roles (Phase 1):**

| Role | Access |
|------|--------|
| admin | Full access to everything |
| operator | Create/read/update families & residents, no delete |
| kepala_desa | Read-only + statistics |

---

# 2. ARCHITECTURAL PHILOSOPHY

**Style:** Strict Layered Monolith. The architecture must never collapse.

**Layer Flow:**
```
Route → Controller → Service → Repository → Prisma → PostgreSQL
```

**Middleware Chain (before controller):**
```
authenticate → authorize([...roles]) → controller
```

---

# 3. LAYER RESPONSIBILITIES

## 3.1 Route Layer
**Allowed:** Define endpoints, apply middleware (authenticate, authorize).
**Not Allowed:** Business logic, Prisma calls, validation.

**Pattern (established):**
```typescript
const router = Router();
router.use(authenticate);
router.post('/', authorize(['admin', 'operator']), createController);
router.get('/', authorize(['admin', 'operator', 'kepala_desa']), listController);
router.delete('/:id', authorize(['admin']), deleteController);
export default router;
```

## 3.2 Controller Layer
**Allowed:** Parse `req.body`/`req.params`/`req.query`/`req.user`, call service, return `apiResponse()`, forward errors to `next()`.
**Not Allowed:** Prisma calls, business logic, Zod validation, transaction handling, role checking.

**Pattern (established):**
```typescript
export async function createController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.create(req.body, req.user!.userId);
    apiResponse({ res, success: true, message: 'Created', data: result, statusCode: 201 });
  } catch (error) {
    next(error);
  }
}
```

## 3.3 Service Layer
**Allowed:** Zod validation, UUID validation, business rules, `prisma.$transaction`, audit log creation, P2002 handling, soft delete interpretation.
**Not Allowed:** Direct `prisma.model.query()` (must use repository), HTTP logic, Express response.

**Patterns (established):**
```typescript
// UUID validation helper
function validateUUID(id: string): string {
  const result = uuidSchema.safeParse(id);
  if (!result.success) throw new ValidationError('Invalid UUID format');
  return result.data;
}

// P2002 handler
function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictError('Resource already exists');
  }
  throw error;
}

// Uniqueness: pre-check + P2002 catch as safety net
const existing = await repo.findByUniqueField(value);
if (existing) throw new ConflictError('Already exists');
try { await repo.create(data); } catch (error) { handlePrismaError(error); }

// Transaction pattern
await prisma.$transaction(async (tx) => {
  const result = await repo.create(data, tx);
  await tx.populationEvent.create({ data: { ... } });
  await tx.auditLog.create({ data: { ... } });
  return result;
});
```

## 3.4 Repository Layer
**Allowed:** Prisma queries only, accept optional transaction client.
**Not Allowed:** Business logic, validation, audit creation, transaction creation, role enforcement.

**Pattern (established):**
```typescript
type Client = Prisma.TransactionClient | typeof prisma;

export function create(data: Prisma.ModelCreateInput, tx?: Prisma.TransactionClient) {
  const client: Client = tx ?? prisma;
  return client.model.create({ data });
}

// All reads filter soft delete
export function findById(id: string) {
  return prisma.model.findFirst({ where: { id, isActive: true } });
}
```

---

# 4. COMPLETE FILE MAP

```
siades-backend/
├── package.json
├── tsconfig.json
├── jest.config.ts
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env                              # DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, PORT
├── .gitignore
├── .github/workflows/ci.yml
├── prisma/
│   ├── schema.prisma                 # LOCKED — do not modify
│   └── seed.ts                       # Roles + admin user
├── src/
│   ├── app.ts                        # Express config + all route registration
│   ├── server.ts                     # Entry point
│   ├── config/
│   │   ├── env.ts                    # requiredEnv() fail-fast loader
│   │   └── prisma.ts                 # Prisma client singleton
│   ├── middleware/
│   │   ├── authenticate.ts           # JWT verify → req.user = { userId, role }
│   │   ├── authorize.ts              # authorize(allowedRoles[]) factory
│   │   └── errorHandler.ts           # AppError + ZodError + 500 handler
│   ├── utils/
│   │   ├── apiResponse.ts            # { success, message, data, error }
│   │   └── appError.ts              # ValidationError(400), AuthenticationError(401),
│   │                                 # AuthorizationError(403), NotFoundError(404),
│   │                                 # ConflictError(409)
│   ├── validators/
│   │   ├── auth.validator.ts         # loginSchema
│   │   ├── family.validator.ts       # createFamilySchema, updateFamilySchema, paginationSchema
│   │   ├── resident.validator.ts     # createResidentSchema(.strict()), updateResidentSchema,
│   │   │                             # patchLifeStatusSchema, patchDomicileStatusSchema,
│   │   │                             # paginationSchema, uuidSchema
│   │   ├── event.validator.ts        # getEventByIdSchema, eventListQuerySchema (date refinement)
│   │   └── statistics.validator.ts   # statisticsSummaryQuerySchema (optional year)
│   └── modules/
│       ├── auth/
│       │   ├── auth.repository.ts    # findUserByEmail (include role)
│       │   ├── auth.service.ts       # login: validate → find → isActive check → bcrypt → JWT
│       │   ├── auth.controller.ts    # loginController, meController
│       │   └── auth.routes.ts        # POST /login (public), GET /me (authenticated)
│       ├── family/
│       │   ├── family.repository.ts  # create, findById, findByNoKK, findMany, count,
│       │   │                         # update, softDelete, softDeleteTx, countActiveResidents
│       │   ├── family.service.ts     # createFamily, getFamilyById, listFamilies,
│       │   │                         # updateFamily, deleteFamily
│       │   ├── family.controller.ts  # 5 CRUD controllers
│       │   └── family.routes.ts      # Full CRUD
│       ├── resident/
│       │   ├── resident.repository.ts # create, findById, findByNik, findMany, count,
│       │   │                          # update, softDelete, updateLifeStatus, updateDomicileStatus
│       │   ├── resident.service.ts    # createBirthResident, createMoveInResident,
│       │   │                          # getResidentById, listResidents, updateResident,
│       │   │                          # patchLifeStatus, patchDomicileStatus, deleteResident
│       │   ├── resident.controller.ts # 8 controllers
│       │   └── resident.routes.ts     # POST /birth, POST /move-in, GET /, GET /:id,
│       │                              # PUT /:id, PATCH /:id/life-status,
│       │                              # PATCH /:id/domicile-status, DELETE /:id
│       ├── event/
│       │   ├── event.repository.ts   # findById, findMany(filters), count(filters) — READ ONLY
│       │   ├── event.service.ts      # getEventById, listEvents
│       │   ├── event.controller.ts   # 2 controllers
│       │   └── event.routes.ts       # GET /, GET /:id — READ ONLY
│       └── statistics/
│           ├── statistics.repository.ts # findEventsByDateRange
│           ├── statistics.service.ts    # getStatisticsSummary (yearly totals + monthly buckets)
│           ├── statistics.controller.ts # 1 controller
│           └── statistics.routes.ts     # GET /summary
├── tests/
│   ├── setup.ts                      # Truncate all tables CASCADE, test DB safety check
│   ├── resident.integration.test.ts  # Birth creation + transaction rollback
│   ├── statistics.integration.test.ts # Yearly/monthly aggregation
│   ├── security.integration.test.ts  # Role denial (403) + unauthenticated (401)
│   ├── conflict.integration.test.ts  # Duplicate NIK (409) on create + update
│   ├── soft-delete.integration.test.ts # Invisibility after delete + DB persistence
│   └── concurrency.integration.test.ts # Parallel duplicate via Promise.allSettled
└── AI_CONTEXT/                       # 13 documentation files for AI context transfer
```

---

# 5. COMPLETE API ENDPOINT MAP

| Method | Path | Auth | Roles | Module |
|--------|------|------|-------|--------|
| GET | /api/health | No | — | app.ts |
| POST | /api/auth/login | No | — | auth |
| GET | /api/auth/me | Yes | any | auth |
| POST | /api/families | Yes | admin, operator | family |
| GET | /api/families | Yes | admin, operator, kepala_desa | family |
| GET | /api/families/:id | Yes | admin, operator, kepala_desa | family |
| PUT | /api/families/:id | Yes | admin, operator | family |
| DELETE | /api/families/:id | Yes | admin | family |
| POST | /api/residents/birth | Yes | admin, operator | resident |
| POST | /api/residents/move-in | Yes | admin, operator | resident |
| GET | /api/residents | Yes | admin, operator, kepala_desa | resident |
| GET | /api/residents/:id | Yes | admin, operator, kepala_desa | resident |
| PUT | /api/residents/:id | Yes | admin, operator | resident |
| PATCH | /api/residents/:id/life-status | Yes | admin, operator | resident |
| PATCH | /api/residents/:id/domicile-status | Yes | admin, operator | resident |
| DELETE | /api/residents/:id | Yes | admin | resident |
| GET | /api/events | Yes | admin, operator, kepala_desa | event |
| GET | /api/events/:id | Yes | admin, operator, kepala_desa | event |
| GET | /api/statistics/summary | Yes | admin, kepala_desa | statistics |

**Route registration in app.ts:**
```typescript
app.use('/api/auth', authRouter);
app.use('/api/families', familyRouter);
app.use('/api/residents', residentRouter);
app.use('/api/events', eventRouter);
app.use('/api/statistics', statisticsRouter);
```

---

# 6. DATABASE SCHEMA (LOCKED)

**All IDs are UUID. No integer PK. Schema must not be modified without explicit instruction.**

## Enums
```
Gender: male, female
MaritalStatus: single, married, divorced, widowed
LifeStatus: alive, deceased
DomicileStatus: permanent, moved
LetterStatus: pending, verified, approved, rejected
EventType: birth, death, move_in, move_out, data_update
```

## Models (Phase 1 — Implemented)

### Role
- id (UUID), name (unique), users[], createdAt, updatedAt

### User
- id, name, email (unique), password (bcrypt), roleId → Role
- isActive (default true), deletedAt?
- Relations: auditLogs[], documents[], populationEvents[], operatorLetters[], kepalaDesaLetters[]

### Family
- id, noKK (unique, 16 chars numeric), alamat, rt, rw, dusun
- isActive (default true), deletedAt?
- residents[]

### Resident
- id, nik (unique, 16 chars numeric), fullName, birthPlace, birthDate, gender, religion, education, occupation, maritalStatus, lifeStatus, domicileStatus, phone?
- isActive (default true), deletedAt?
- familyId → Family, events[], letters[]
- @@index([familyId]), @@index([lifeStatus])

### PopulationEvent
- id, eventType, description?, eventDate
- residentId → Resident, createdById → User
- @@index([residentId]), @@index([eventType])

### AuditLog
- id, action, tableName, recordId, ipAddress?
- userId? → User
- @@index([userId]), @@index([tableName])

## Models (Phase 2 — Schema Exists, Not Implemented)
- LetterType, LetterRequest, Document, DigitalSignature

---

# 7. SOFT DELETE POLICY

**No hard delete allowed on core entities.**

Rules:
- delete() sets: `isActive = false`, `deletedAt = new Date()`
- All repository read queries filter: `where: { isActive: true }`
- Uses `findFirst` (not `findUnique`) to combine id + isActive filter
- Service converts null results to `NotFoundError`
- Deleted records: not in list, not retrievable, not updatable, still physically in DB

---

# 8. TRANSACTION POLICY

**Required for all multi-table writes. No partial commits.**

| Operation | Tables Written | Transactional |
|-----------|---------------|---------------|
| Create resident (birth/move-in) | Resident + PopulationEvent + AuditLog | Yes |
| Patch life status | Resident + PopulationEvent + AuditLog | Yes |
| Patch domicile status | Resident + PopulationEvent + AuditLog | Yes |
| Delete resident | Resident + AuditLog | Yes |
| Delete family | Family + AuditLog | Yes |
| Create family | Family, then AuditLog | No (single entity) |
| Update family | Family, then AuditLog | No (single entity) |
| Update resident | Resident + AuditLog | Yes |

**Transaction pattern:**
- Service calls `prisma.$transaction(async (tx) => { ... })`
- Repository functions accept `tx?: Prisma.TransactionClient`
- Audit log created inside transaction when applicable

---

# 9. P2002 HANDLING RULE

When Prisma throws `PrismaClientKnownRequestError` with `code === 'P2002'`:

1. Pre-check uniqueness first (e.g., `findByNik()`, `findByNoKK()`)
2. Catch P2002 as safety net for race conditions
3. Convert to `ConflictError(409)`
4. Never expose raw Prisma error to client

---

# 10. RESIDENT DOMAIN RULES

**No generic create endpoint.** Two domain-specific creation paths:

| Path | Event Type | Sets |
|------|-----------|------|
| POST /api/residents/birth | birth | lifeStatus='alive', domicileStatus='permanent' |
| POST /api/residents/move-in | move_in | lifeStatus='alive', domicileStatus='permanent' |

Service **always overrides** lifeStatus and domicileStatus to defaults regardless of input.

**Status transitions (one-way only):**

| Transition | Endpoint | Event Created | Validation |
|-----------|----------|---------------|------------|
| alive → deceased | PATCH /life-status | death | Must currently be alive |
| permanent → moved | PATCH /domicile-status | move_out | Must currently be permanent |

Reverse transitions are **not allowed**.

**Update restrictions:**
- `updateResidentSchema` omits `lifeStatus` and `domicileStatus` — these cannot be changed via PUT
- If `familyId` is provided in update, service validates the family exists and is active

---

# 11. POPULATION EVENT POLICY

- Events are **immutable** — no update or delete endpoints
- Created automatically during resident operations (birth, move_in, death, move_out)
- Event module is **read-only** (GET list + GET by ID)
- `createdById` = `req.user.userId` (from JWT)
- `eventDate` = `new Date()` at creation time
- Query filters: eventType, residentId, startDate, endDate (with refinement: start <= end)

---

# 12. STATISTICS MODULE

- Endpoint: `GET /api/statistics/summary?year=2025`
- Roles: admin, kepala_desa only
- Repository: `findEventsByDateRange(startDate, endDate)` — selects only eventType + eventDate
- Service: builds 12 monthly buckets, loops events, increments totals + monthly counters
- Returns: `{ year, totals: { birth, death, move_in, move_out }, monthly: [...12 buckets] }`
- Year defaults to current year if not provided
- Does not depend on array order

---

# 13. AUDIT LOG POLICY

**Every critical action creates an AuditLog entry.**

| Field | Source |
|-------|--------|
| action | CREATE, UPDATE, DELETE |
| tableName | Family, Resident, PopulationEvent |
| recordId | UUID of affected record |
| userId | req.user.userId (from JWT) |
| ipAddress | Not yet implemented |

- Audit logs are **immutable** — no update or delete
- For transactional operations: audit is part of the transaction
- For non-transactional operations: audit written after main operation

---

# 14. ERROR HANDLING

## Error Classes
| Class | Status | When |
|-------|--------|------|
| ValidationError | 400 | Invalid input format, invalid UUID |
| AuthenticationError | 401 | Missing/invalid/expired token, wrong credentials |
| AuthorizationError | 403 | Insufficient role |
| NotFoundError | 404 | Resource not found (soft-deleted = not found) |
| ConflictError | 409 | Duplicate unique field, invalid state transition, delete with children |

## ZodError
Caught separately → 400 with field-level details:
```json
{ "success": false, "message": "Validation error", "error": [{ "field": "nik", "message": "..." }] }
```

## API Response Format (all endpoints)
```json
{ "success": true|false, "message": "string", "data": {}|[]|null, "error": null|{} }
```

---

# 15. AUTHENTICATION & AUTHORIZATION

## JWT
- Payload: `{ userId: string, role: string, iat, exp }`
- Header: `Authorization: Bearer <token>`
- expiresIn from `JWT_EXPIRES_IN` env var
- Sign with `env.JWT_SECRET`
- Type assertion: `expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']`

## Login Flow
1. Zod validate email + password
2. Find user by email (include role)
3. Check `isActive && !deletedAt`
4. bcrypt compare password
5. Sign JWT with { userId, role: user.role.name }
6. Generic error message for all failures: "Invalid email or password"

## Middleware
- `authenticate`: extracts Bearer token → verifies JWT → sets `req.user = { userId, role }`
- `authorize(allowedRoles)`: checks `req.user.role` against allowed list → 403 if not allowed

## Express Type Extension
```typescript
declare global { namespace Express { interface Request { user?: JwtPayload; } } }
```

---

# 16. VALIDATION RULES

## Family
- noKK: 16 chars, numeric only
- alamat: min 5, max 255
- rt/rw: max 3 chars, numeric only
- dusun: min 2, max 100
- updateSchema: `.partial()`

## Resident
- nik: 16 chars, regex `/^\d{16}$/`
- fullName: min 2, max 255
- birthPlace: min 2, max 100
- birthDate: coerced date, not future
- gender: nativeEnum(Gender)
- religion: min 2, max 50
- education: min 2, max 100
- occupation: min 2, max 100
- maritalStatus: nativeEnum(MaritalStatus)
- lifeStatus: optional on create (overridden to 'alive')
- domicileStatus: nativeEnum (overridden to 'permanent')
- phone: optional/nullable, max 20
- familyId: UUID
- All schemas use `.strict()` — no extra fields
- updateSchema: omits lifeStatus + domicileStatus, then `.partial().strict()`

## Pagination (all list endpoints)
- page: coerce int, min 1, default 1
- limit: coerce int, min 1, max 100, default 20

---

# 17. TESTING STRATEGY

## Stack
- Jest (ts-jest) + Supertest
- Real PostgreSQL (no mocking)
- Separate test database (DATABASE_URL must contain "test")
- All tables truncated CASCADE before each test

## Coverage Thresholds (jest.config.ts)
- branches: 80%, functions: 85%, lines: 90%, statements: 90%

## Test Suites (6 files)

| File | Tests |
|------|-------|
| resident.integration.test.ts | Birth creation (resident+event+audit), transaction rollback |
| statistics.integration.test.ts | Yearly totals, monthly bucket aggregation |
| security.integration.test.ts | Operator → 403 on stats, kepala_desa → 403 on delete, 401 unauthenticated |
| conflict.integration.test.ts | Duplicate NIK on create → 409, duplicate NIK on update → 409 |
| soft-delete.integration.test.ts | GET 404 after delete, excluded from list, 404 on update, still in DB |
| concurrency.integration.test.ts | Parallel duplicate NIK via Promise.allSettled → one 201 + one 409 |

## Test Patterns
- Each test creates its own data (roles, users, families) — no shared fixtures
- Auth: create user via Prisma → POST /api/auth/login → use token
- Event date manipulation: `prisma.populationEvent.updateMany` by residentId + eventType
- Concurrency: `Promise.allSettled` to capture both success and failure

---

# 18. CI/CD

## GitHub Actions (.github/workflows/ci.yml)
Three jobs:
1. **typecheck** — `npm ci` → `prisma generate` → `tsc --noEmit`
2. **test** — PostgreSQL service container → `prisma db push` → `npm run test -- --coverage --forceExit --detectOpenHandles`
3. **build** — `npm ci` → `prisma generate` → `npm run build`

Test DB: `postgresql://siades_test:siades_test@localhost:5432/siades_test`
Wait loop: `pg_isready -h localhost -p 5432 -U siades_test`

---

# 19. DOCKER

## Dockerfile (multi-stage)
- **Builder:** node:20-alpine → npm ci → prisma generate → tsc build
- **Runner:** node:20-alpine → non-root user (app:app) → copy node_modules + dist + prisma from builder → NODE_ENV=production → EXPOSE 3000

## docker-compose.yml
- **app:** builds Dockerfile, port 3000, command: `prisma migrate deploy && node dist/server.js`
- **db:** postgres:16, user/pass/db: siades, volume: postgres_data

---

# 20. SEED DATA

- Roles: admin, operator, kepala_desa (upsert by name)
- Admin user: admin@siades.test / admin123 (bcrypt hashed, salt 10)
- Run: `npx prisma db seed`
- Config in package.json: `"prisma": { "seed": "ts-node prisma/seed.ts" }`

---

# 21. GOVERNANCE RULES (NON-NEGOTIABLE)

**NEVER:**
- Collapse layers (controller must not call Prisma, service must not call repository directly via Prisma)
- Query Prisma in controller
- Skip soft delete filter in repository reads
- Hard delete any core entity
- Skip transaction for multi-table writes
- Remove audit on critical actions
- Bypass P2002 handling
- Remove coverage thresholds
- Expose raw database errors to client
- Add fields not in prisma/schema.prisma
- Modify prisma/schema.prisma without explicit instruction
- Change the technology stack
- Place validation logic in controller
- Check roles inline in controller or service (use middleware only)

**ALWAYS:**
- UUID primary keys
- Soft delete via isActive + deletedAt
- Validate all input via Zod in service layer
- Use transactions for multi-step operations
- Paginate all list endpoints (default 20, max 100)
- Return standardized API response format
- Use centralized error handling
- Follow layered architecture strictly
- Use `.strict()` on Zod schemas for resident module
- Follow established patterns from existing modules

---

# 22. WHAT'S NOT YET IMPLEMENTED

| Feature | Phase | Notes |
|---------|-------|-------|
| User registration endpoint | Phase 1 | Admin-only, create new users |
| User management CRUD | Phase 1 | Admin-only |
| Letter type management | Phase 2 | Schema exists (LetterType model) |
| Letter request workflow | Phase 2 | Schema exists (LetterRequest model) |
| Document upload | Phase 2 | Schema exists (Document model) |
| Digital signature | Phase 2 | Schema exists (DigitalSignature model) |
| data_update event type | Phase 1 | EventType exists, no trigger implemented |
| ipAddress in audit log | Phase 1 | Field exists, not populated |
| Citizen portal | Phase 3 | warga role not yet created |

---

# 23. SYSTEM MATURITY

This system is:
- **Transaction-safe** — all multi-table writes in prisma.$transaction
- **Conflict-safe** — pre-check + P2002 catch for race conditions
- **Concurrency-hardened** — tested with parallel duplicate requests
- **Soft-delete disciplined** — all reads filter isActive: true
- **Role-secured** — middleware-only authorization, tested
- **Aggregation-verified** — statistics tested with real data
- **CI-enforced** — typecheck + test + build + coverage gates
- **Dockerized** — multi-stage, non-root, production-ready
- **Domain-correct** — birth/move-in creation, one-way status transitions

---

END OF BASELINE DOCUMENT
