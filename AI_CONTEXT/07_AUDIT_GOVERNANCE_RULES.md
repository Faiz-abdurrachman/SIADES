# 07 — Audit & Governance Rules

## Audit Log Model
```prisma
model AuditLog {
  id         String   @id @default(uuid())
  action     String
  tableName  String
  recordId   String
  ipAddress  String?
  userId     String?
  user       User?    @relation(fields: [userId], references: [id])
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([tableName])
}
```

## Audit Policy

### When to Log
Every critical action must create an AuditLog entry:
- CREATE on any core entity (Family, Resident, PopulationEvent)
- UPDATE on any core entity
- DELETE (soft delete) on any core entity
- Status changes (lifeStatus, domicileStatus)

### Audit Log Fields
| Field | Source |
|-------|--------|
| action | CREATE, UPDATE, DELETE |
| tableName | Entity name (Family, Resident, PopulationEvent) |
| recordId | UUID of the affected record |
| userId | req.user.userId (from JWT) |
| ipAddress | req.ip (not yet implemented) |

### Implemented Audit Points
| Module | Action | tableName | Transactional |
|--------|--------|-----------|---------------|
| Family | CREATE | Family | No (single write) |
| Family | UPDATE | Family | No (single write) |
| Family | DELETE | Family | Yes (softDelete + audit) |
| Resident | CREATE | Resident | Yes (resident + event + audit) |
| Resident | UPDATE | Resident | Yes (update + audit) |
| Resident | DELETE | Resident | Yes (softDelete + audit) |
| Resident | UPDATE (lifeStatus) | Resident | Yes (status + event + audit) |
| Resident | UPDATE (domicileStatus) | Resident | Yes (status + event + audit) |

### Rules
- Audit logs are IMMUTABLE — no update or delete operations
- Audit logs are created in the service layer
- For transactional operations, audit log must be part of the transaction
- For non-transactional operations, audit log is written after the main operation
- userId is nullable (for system-generated events)

## Non-Negotiable Engineering Rules

### DO NOT:
1. Merge Resident and Family entities
2. Replace UUID with integer
3. Remove AuditLog
4. Collapse relational schema
5. Skip validation
6. Skip transactions on multi-table writes
7. Hard delete core entities
8. Expose raw database errors

### MUST:
1. Use UUID primary keys everywhere
2. Soft delete via isActive + deletedAt only
3. Validate all input before business logic
4. Use transactions for multi-step operations
5. Paginate all list endpoints (default: 20, max: 100)
6. Return standardized API response format
7. Use centralized error handling
8. Follow layered architecture strictly
