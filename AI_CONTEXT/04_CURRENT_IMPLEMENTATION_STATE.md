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

### Core Files
| File | Status | Purpose |
|------|--------|---------|
| src/server.ts | Done | Entry point |
| src/app.ts | Done | Express config, route registration, error handler |
| src/config/env.ts | Done | Fail-fast environment loading |
| src/config/prisma.ts | Done | Prisma client singleton |
| src/utils/apiResponse.ts | Done | Standardized response builder |
| src/utils/appError.ts | Done | AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError |
| src/middleware/errorHandler.ts | Done | Catches AppError, ZodError, unknown errors |
| src/middleware/authenticate.ts | Done | JWT verification, sets req.user |
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

## Not Yet Implemented
- Resident module (CRUD + status changes)
- Population event module (birth, death, move_in, move_out)
- Letter management (Phase 2)
- User registration endpoint (admin only)

## Seed Data
- Roles: admin, operator, kepala_desa
- Admin user: admin@siades.test / admin123 (bcrypt hashed)
- Run: `npx prisma db seed`

All Family read operations already enforce isActive: true filtering.
