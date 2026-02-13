# 05 — Resident Module Technical Spec

## Status: NOT YET IMPLEMENTED

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

## Planned Endpoints
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /api/residents | admin, operator | Create resident |
| GET | /api/residents | admin, operator, kepala_desa | List residents (paginated) |
| GET | /api/residents/:id | admin, operator, kepala_desa | Get resident by ID |
| PUT | /api/residents/:id | admin, operator | Update resident data |
| PATCH | /api/residents/:id/life-status | admin, operator | Change life status |
| PATCH | /api/residents/:id/domicile-status | admin, operator | Change domicile status |
| DELETE | /api/residents/:id | admin | Soft delete resident |

## Validation Rules (Planned)
- nik: string, exactly 16 characters, numeric only
- fullName: string, min 2, max 255
- birthPlace: string, min 2, max 100
- birthDate: valid date, not in the future
- gender: must be valid Gender enum (male/female)
- religion: string, min 2, max 50
- education: string, min 2, max 100
- occupation: string, min 2, max 100
- maritalStatus: must be valid MaritalStatus enum
- lifeStatus: must be valid LifeStatus enum
- domicileStatus: must be valid DomicileStatus enum
- phone: optional string
- familyId: valid UUID, must reference active Family

## Business Rules
- Create resident must verify familyId references an active family
- Create resident should create a PopulationEvent (birth/move_in) in transaction
- Changing lifeStatus to deceased must create death PopulationEvent in transaction
- Changing domicileStatus to moved must create move_out PopulationEvent in transaction
- nik uniqueness must be enforced (pre-check + P2002 catch)
- Soft delete only (isActive + deletedAt)
- All find queries filter isActive: true
- Audit log for every critical action
- All Resident read queries must filter isActive: true
- Soft-deleted residents must be invisible

## Layered Structure
```
src/modules/resident/
├── resident.routes.ts
├── resident.controller.ts
├── resident.service.ts
└── resident.repository.ts

src/validators/
└── resident.validator.ts
```
