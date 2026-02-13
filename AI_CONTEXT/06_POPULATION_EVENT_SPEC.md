# 06 — Population Event Module Spec

## Status: FULLY IMPLEMENTED

## Prisma Model Reference
```prisma
model PopulationEvent {
  id         String     @id @default(uuid())
  eventType  EventType
  description String?
  eventDate  DateTime
  residentId String
  resident   Resident   @relation(fields: [residentId], references: [id])
  createdById String
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdAt  DateTime   @default(now())

  @@index([residentId])
  @@index([eventType])
}
```

## Event Types
| Type | Trigger | Created By |
|------|---------|-----------|
| birth | New resident born | Resident service: `createBirthResident()` |
| death | Resident deceased | Resident service: `patchLifeStatus()` |
| move_in | Resident moves into village | Resident service: `createMoveInResident()` |
| move_out | Resident leaves village | Resident service: `patchDomicileStatus()` |
| data_update | Resident data corrected | Not yet implemented |

## Architecture Decision: Events Are Created Via Resident Service
Population events are NOT created directly via a POST endpoint. They are created as side effects of resident operations within transactions:

- `POST /api/residents/birth` → creates `birth` event
- `POST /api/residents/move-in` → creates `move_in` event
- `PATCH /api/residents/:id/life-status` → creates `death` event
- `PATCH /api/residents/:id/domicile-status` → creates `move_out` event

The event module itself is **read-only**.

## Transaction Requirements (Implemented in resident.service.ts)

### Birth Event
1. Create Resident record
2. Create PopulationEvent (type: birth)
3. Create AuditLog
All in single `prisma.$transaction`.

### Death Event
1. Update Resident.lifeStatus → deceased
2. Create PopulationEvent (type: death)
3. Create AuditLog
All in single `prisma.$transaction`.

### Move In Event
1. Create Resident record
2. Create PopulationEvent (type: move_in)
3. Create AuditLog
All in single `prisma.$transaction`.

### Move Out Event
1. Update Resident.domicileStatus → moved
2. Create PopulationEvent (type: move_out)
3. Create AuditLog
All in single `prisma.$transaction`.

## Implemented Endpoints (Read-Only)
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /api/events | admin, operator, kepala_desa | List events (paginated, filterable) |
| GET | /api/events/:id | admin, operator, kepala_desa | Get event by ID |

## Event Query Filters (eventListQuerySchema)
- `eventType`: optional, filter by EventType enum
- `residentId`: optional UUID, filter by resident
- `startDate`: optional date, filter events on or after
- `endDate`: optional date, filter events on or before
- Refinement: `startDate <= endDate` when both provided
- `page`: default 1, `limit`: default 20, max 100

## Business Rules
- Events are immutable — no update or delete endpoints
- createdById comes from authenticated user (req.user.userId)
- eventDate is set to `new Date()` at creation time
- Death event requires resident to be currently alive
- Move out event requires resident domicileStatus to be permanent
- No partial commits — all operations are transactional
