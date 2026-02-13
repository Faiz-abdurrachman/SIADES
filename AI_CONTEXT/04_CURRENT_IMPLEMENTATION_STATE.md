# 04 — Current Implementation State

## Completed Modules

### Infrastructure
| File | Status | Purpose |
|------|--------|---------|
| package.json | Done | Dependencies and scripts |
| tsconfig.json | Done | TypeScript strict config |
| .env | Done | DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, PORT |
| .gitignore | Done | node_modules, dist, .env |
| prisma/schema.prisma | Locked | Database schema |
| prisma/seed.ts | Done | Roles + admin user seeder |
| jest.config.ts | Done | ts-jest, coverage thresholds (80/85/90/90) |
| Dockerfile | Done | Multi-stage (builder + runner), non-root user |
| docker-compose.yml | Done | app + postgres services |
| .dockerignore | Done | Excludes node_modules, dist, .env, etc. |
| .github/workflows/ci.yml | Done | typecheck + integration tests + build |

### Core Files
| File | Status | Purpose |
|------|--------|---------|
| src/server.ts | Done | Entry point |
| src/app.ts | Done | Express config, all route registration, error handler |
| src/config/env.ts | Done | Fail-fast environment loading |
| src/config/prisma.ts | Done | Prisma client singleton |
| src/utils/apiResponse.ts | Done | Standardized response builder |
| src/utils/appError.ts | Done | AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError |
| src/middleware/errorHandler.ts | Done | Catches AppError, ZodError, unknown errors |
| src/middleware/authenticate.ts | Done | JWT verification, sets req.user (userId, role) |
| src/middleware/authorize.ts | Done | Role-check factory function |

### Auth Module
| File | Status | Purpose |
|------|--------|---------|
| src/modules/auth/auth.repository.ts | Done | findUserByEmail (with role include) |
| src/modules/auth/auth.service.ts | Done | login (validate → find → soft delete check → bcrypt → JWT) |
| src/modules/auth/auth.controller.ts | Done | loginController, meController |
| src/modules/auth/auth.routes.ts | Done | POST /login, GET /me |
| src/validators/auth.validator.ts | Done | loginSchema (email + password) |

### Family Module
| File | Status | Purpose |
|------|--------|---------|
| src/modules/family/family.repository.ts | Done | create, findById, findByNoKK, findMany, count, update, softDelete, softDeleteTx, countActiveResidents |
| src/modules/family/family.service.ts | Done | createFamily, getFamilyById, listFamilies, updateFamily, deleteFamily |
| src/modules/family/family.controller.ts | Done | All 5 CRUD controllers |
| src/modules/family/family.routes.ts | Done | Full CRUD with auth + role middleware |
| src/validators/family.validator.ts | Done | createFamilySchema, updateFamilySchema, paginationSchema |

### Resident Module
| File | Status | Purpose |
|------|--------|---------|
| src/modules/resident/resident.repository.ts | Done | create, findById, findByNik, findMany, count, update, softDelete, updateLifeStatus, updateDomicileStatus (all with optional tx) |
| src/modules/resident/resident.service.ts | Done | createBirthResident, createMoveInResident, getResidentById, listResidents, updateResident, patchLifeStatus, patchDomicileStatus, deleteResident |
| src/modules/resident/resident.controller.ts | Done | 8 controllers matching service methods |
| src/modules/resident/resident.routes.ts | Done | POST /birth, POST /move-in, GET /, GET /:id, PUT /:id, PATCH /:id/life-status, PATCH /:id/domicile-status, DELETE /:id |
| src/validators/resident.validator.ts | Done | createResidentSchema (.strict()), updateResidentSchema (omits lifeStatus/domicileStatus, partial), patchLifeStatusSchema, patchDomicileStatusSchema, paginationSchema, uuidSchema |

### Event Module (Read-Only)
| File | Status | Purpose |
|------|--------|---------|
| src/modules/event/event.repository.ts | Done | findById, findMany (with filters), count (with filters) |
| src/modules/event/event.service.ts | Done | getEventById, listEvents (paginated with filters) |
| src/modules/event/event.controller.ts | Done | getEventByIdController, listEventsController |
| src/modules/event/event.routes.ts | Done | GET /, GET /:id |
| src/validators/event.validator.ts | Done | getEventByIdSchema, eventListQuerySchema (with date range refinement) |

### Statistics Module
| File | Status | Purpose |
|------|--------|---------|
| src/modules/statistics/statistics.repository.ts | Done | findEventsByDateRange (selects eventType + eventDate only) |
| src/modules/statistics/statistics.service.ts | Done | getStatisticsSummary (yearly totals + monthly buckets) |
| src/modules/statistics/statistics.controller.ts | Done | getStatisticsSummaryController |
| src/modules/statistics/statistics.routes.ts | Done | GET /summary |
| src/validators/statistics.validator.ts | Done | statisticsSummaryQuerySchema (optional year) |

### Integration Tests
| File | Status | Coverage |
|------|--------|----------|
| tests/setup.ts | Done | Truncate all tables CASCADE, safety check for test DB |
| tests/resident.integration.test.ts | Done | Birth creation (resident + event + audit), transaction rollback |
| tests/statistics.integration.test.ts | Done | Yearly/monthly aggregation with real data |
| tests/security.integration.test.ts | Done | Role denial (403), unauthenticated (401) |
| tests/conflict.integration.test.ts | Done | Duplicate NIK on create (409), duplicate NIK on update (409) |
| tests/soft-delete.integration.test.ts | Done | 404 after delete, excluded from list, not updatable, still in DB |
| tests/concurrency.integration.test.ts | Done | Parallel duplicate NIK via Promise.allSettled |

## API Endpoints

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | /api/health | No | — | Done |
| POST | /api/auth/login | No | — | Done |
| GET | /api/auth/me | Yes | any | Done |
| POST | /api/families | Yes | admin, operator | Done |
| GET | /api/families | Yes | admin, operator, kepala_desa | Done |
| GET | /api/families/:id | Yes | admin, operator, kepala_desa | Done |
| PUT | /api/families/:id | Yes | admin, operator | Done |
| DELETE | /api/families/:id | Yes | admin | Done |
| POST | /api/residents/birth | Yes | admin, operator | Done |
| POST | /api/residents/move-in | Yes | admin, operator | Done |
| GET | /api/residents | Yes | admin, operator, kepala_desa | Done |
| GET | /api/residents/:id | Yes | admin, operator, kepala_desa | Done |
| PUT | /api/residents/:id | Yes | admin, operator | Done |
| PATCH | /api/residents/:id/life-status | Yes | admin, operator | Done |
| PATCH | /api/residents/:id/domicile-status | Yes | admin, operator | Done |
| DELETE | /api/residents/:id | Yes | admin | Done |
| GET | /api/events | Yes | admin, operator, kepala_desa | Done |
| GET | /api/events/:id | Yes | admin, operator, kepala_desa | Done |
| GET | /api/statistics/summary | Yes | admin, kepala_desa | Done |

## Not Yet Implemented
- Letter management (Phase 2: LetterType, LetterRequest, Document, DigitalSignature)
- User registration endpoint (admin only)
- User management CRUD

## Seed Data
- Roles: admin, operator, kepala_desa
- Admin user: admin@siades.test / admin123 (bcrypt hashed)
- Run: `npx prisma db seed`

## Key Technical Decisions
- Resident creation split into `POST /birth` and `POST /move-in` (domain-correct, not generic create)
- lifeStatus/domicileStatus excluded from updateResidentSchema (changed only via PATCH endpoints)
- Service always enforces `lifeStatus: 'alive'` and `domicileStatus: 'permanent'` on creation regardless of input
- Status transitions are one-way: alive→deceased, permanent→moved
- Event module is read-only (events created via resident service transactions)
- Statistics aggregation done in-memory after DB fetch (no complex SQL)
