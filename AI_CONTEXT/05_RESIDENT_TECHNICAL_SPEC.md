# 05 — Resident Module Technical Spec

## Status: FULLY IMPLEMENTED

## Prisma Model Reference
```prisma
model Resident {
  id             String           @id @default(uuid())
  nik            String           @unique
  fullName       String
  birthPlace     String
  birthDate      DateTime
  gender         Gender
  religion       String
  education      String
  occupation     String
  maritalStatus  MaritalStatus
  lifeStatus     LifeStatus
  domicileStatus DomicileStatus
  phone          String?
  isActive       Boolean          @default(true)
  deletedAt      DateTime?
  familyId       String
  family         Family           @relation(fields: [familyId], references: [id])
  events         PopulationEvent[]
  letters        LetterRequest[]
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([familyId])
  @@index([lifeStatus])
}
```

## Implemented Endpoints
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /api/residents/birth | admin, operator | Create resident via birth event |
| POST | /api/residents/move-in | admin, operator | Create resident via move-in event |
| GET | /api/residents | admin, operator, kepala_desa | List residents (paginated) |
| GET | /api/residents/:id | admin, operator, kepala_desa | Get resident by ID (includes family) |
| PUT | /api/residents/:id | admin, operator | Update resident data |
| PATCH | /api/residents/:id/life-status | admin, operator | Change life status (alive→deceased only) |
| PATCH | /api/residents/:id/domicile-status | admin, operator | Change domicile status (permanent→moved only) |
| DELETE | /api/residents/:id | admin | Soft delete resident |

## Domain-Correct Creation Design
No generic `POST /api/residents`. Instead:
- `POST /birth` — creates resident + `birth` PopulationEvent + AuditLog in single transaction
- `POST /move-in` — creates resident + `move_in` PopulationEvent + AuditLog in single transaction
- Both enforce `lifeStatus: 'alive'` and `domicileStatus: 'permanent'` regardless of input

## Validation Rules (Implemented in resident.validator.ts)
- nik: string, exactly 16 characters, numeric only (`/^\d{16}$/`)
- fullName: string, min 2, max 255
- birthPlace: string, min 2, max 100
- birthDate: coerced date, not in the future
- gender: must be valid Gender enum (male/female)
- religion: string, min 2, max 50
- education: string, min 2, max 100
- occupation: string, min 2, max 100
- maritalStatus: must be valid MaritalStatus enum
- lifeStatus: optional on create (service overrides to 'alive')
- domicileStatus: valid DomicileStatus enum on create (service overrides to 'permanent')
- phone: optional/nullable string, max 20
- familyId: valid UUID, must reference active Family
- All schemas use `.strict()` — no extra fields allowed
- updateResidentSchema omits lifeStatus and domicileStatus, then `.partial().strict()`

## Business Rules (Implemented)
1. **Creation** — must verify familyId references an active family
2. **Creation** — pre-check NIK uniqueness + P2002 catch as safety net
3. **Creation** — single transaction: Resident + PopulationEvent + AuditLog
4. **Life status** — only transition: `alive → deceased` (creates death event in tx)
5. **Domicile status** — only transition: `permanent → moved` (creates move_out event in tx)
6. **Update** — validates family existence if familyId provided, P2002 catch for NIK
7. **Soft delete** — sets isActive=false + deletedAt + AuditLog in transaction
8. **All reads** — filter `isActive: true`, include `family: { id, noKK, alamat }`
9. **Soft-deleted residents** — invisible to GET, 404 on update/delete

## Repository Pattern
- All functions accept optional `tx?: Prisma.TransactionClient`
- Uses `Client = Prisma.TransactionClient | typeof prisma` type alias
- Functions: create, findById, findByNik, findMany, count, update, softDelete, updateLifeStatus, updateDomicileStatus

## Layered Structure
```
src/modules/resident/
├── resident.routes.ts       # Route definitions + middleware
├── resident.controller.ts   # 8 controllers
├── resident.service.ts      # Business logic + transactions
└── resident.repository.ts   # Prisma queries with optional tx

src/validators/
└── resident.validator.ts    # Zod schemas + type exports
```
