# 02 — Architecture Constitution

## Architecture Style
Layered Monolith with strict separation.

## Layer Flow
```
Route → Controller → Service → Repository → Prisma → PostgreSQL
```

## Layer Responsibilities

### Route Layer
- Define endpoints only
- Apply middleware (authenticate, authorize)
- No business logic
- No Prisma calls

### Controller Layer
- Parse request (body, params, query, user)
- Call service
- Return standardized response via apiResponse utility
- Forward errors to next()
- No business logic
- No Prisma calls
- No validation logic

### Service Layer
- Business logic
- Input validation (Zod schema.parse())
- Transaction control
- Domain rules enforcement
- Audit log creation
- Throws AppError subclasses
- All read operations must enforce soft delete filtering (isActive: true)

### Repository Layer
- Prisma queries only
- No business logic
- Accepts transaction client where needed (e.g., softDeleteTx)
- Uses `Client = Prisma.TransactionClient | typeof prisma` pattern for tx support

### Middleware Layer
- Authentication (JWT verification)
- Authorization (role checking)
- Error handling (centralized)

## Folder Structure
```
src/
├── app.ts                          # Express app config, route registration
├── server.ts                       # Entry point
├── config/
│   ├── env.ts                      # Environment variables (fail-fast)
│   └── prisma.ts                   # Prisma client singleton
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.repository.ts
│   ├── family/
│   │   ├── family.routes.ts
│   │   ├── family.controller.ts
│   │   ├── family.service.ts
│   │   └── family.repository.ts
│   ├── resident/
│   │   ├── resident.routes.ts
│   │   ├── resident.controller.ts
│   │   ├── resident.service.ts
│   │   └── resident.repository.ts
│   ├── event/
│   │   ├── event.routes.ts
│   │   ├── event.controller.ts
│   │   ├── event.service.ts
│   │   └── event.repository.ts
│   └── statistics/
│       ├── statistics.routes.ts
│       ├── statistics.controller.ts
│       ├── statistics.service.ts
│       └── statistics.repository.ts
├── middleware/
│   ├── authenticate.ts             # JWT verification, sets req.user
│   ├── authorize.ts                # checkRole factory
│   └── errorHandler.ts             # Centralized error handler
├── utils/
│   ├── apiResponse.ts              # Standard response builder
│   └── appError.ts                 # Custom error classes
└── validators/
    ├── auth.validator.ts           # Login Zod schema
    ├── family.validator.ts         # Family CRUD Zod schemas
    ├── resident.validator.ts       # Resident CRUD + status patch Zod schemas
    ├── event.validator.ts          # Event query Zod schemas
    └── statistics.validator.ts     # Statistics query Zod schema
```

## API Response Standard
All endpoints must return:
```json
{
  "success": true | false,
  "message": "string",
  "data": {} | [] | null,
  "error": null | {}
}
```

## Error Classes
| Class | HTTP Status | Usage |
|-------|-------------|-------|
| ValidationError | 400 | Invalid input format |
| AuthenticationError | 401 | Missing/invalid token, wrong credentials |
| AuthorizationError | 403 | Insufficient role permissions |
| NotFoundError | 404 | Resource not found |
| ConflictError | 409 | Duplicate unique field, invalid state transitions |

ZodError is caught separately and returns 400 with field-level details.

## Patterns Established
- UUID validation via Zod before DB calls
- P2002 (unique constraint) catch as safety net after pre-check
- Parallel queries with Promise.all for independent operations
- Transaction client passed to repository for transactional operations
- Router-level authenticate with per-route authorize
- Domain-correct creation: separate endpoints for birth vs move-in (not generic create)
- Status transitions: one-way only (alive→deceased, permanent→moved)
- `Client = Prisma.TransactionClient | typeof prisma` type alias in repository
