# 06 — Population Event Module Spec

## Status: NOT YET IMPLEMENTED

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
| Type | Trigger | Side Effects |
|------|---------|-------------|
| birth | New resident born | Create resident + event in transaction |
| death | Resident deceased | Update lifeStatus to deceased + event in transaction |
| move_in | Resident moves into village | Create resident + event in transaction |
| move_out | Resident leaves village | Update domicileStatus to moved + event in transaction |
| data_update | Resident data corrected | Log the update event |

## Transaction Requirements

### Birth Event
1. Create Resident record
2. Create PopulationEvent (type: birth)
3. Create AuditLog
All in single transaction.

### Death Event
1. Update Resident.lifeStatus → deceased
2. Create PopulationEvent (type: death)
3. Create AuditLog
All in single transaction.

### Move In Event
1. Create Resident record
2. Create PopulationEvent (type: move_in)
3. Create AuditLog
All in single transaction.

### Move Out Event
1. Update Resident.domicileStatus → moved
2. Create PopulationEvent (type: move_out)
3. Create AuditLog
All in single transaction.

## Planned Endpoints
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /api/events | admin, operator | Record population event |
| GET | /api/events | admin, operator, kepala_desa | List events (paginated) |
| GET | /api/events/:id | admin, operator, kepala_desa | Get event by ID |
| GET | /api/residents/:id/events | admin, operator, kepala_desa | Get events for resident |

## Business Rules
- Every event must reference a valid, active resident
- createdById comes from authenticated user (req.user.userId)
- eventDate is required and must be a valid date
- Events are immutable — no update or delete endpoints
- Death event must verify resident is currently alive
- Move out event must verify resident domicileStatus is permanent
- No partial commits allowed
