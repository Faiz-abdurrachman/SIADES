# 12 — Testing Strategy

Testing is mandatory before production.

---

# Testing Levels

1. Unit Tests
2. Integration Tests
3. Transaction Tests
4. Authorization Tests
5. Soft Delete Behavior Tests

---

# 1️⃣ Unit Testing (Service Layer)

Test:
- Validation rejection
- Conflict detection
- NotFound behavior
- UUID validation
- Business rule enforcement

Example:
- Creating family with duplicate noKK → ConflictError
- Deleting family with active residents → ConflictError
- Invalid UUID → ValidationError

Tool:
- Jest or Vitest

---

# 2️⃣ Integration Testing (API Level)

Use:
- Supertest

Test:
- Login success
- Login failure
- Protected route without token → 401
- Protected route with wrong role → 403
- Create family → 201
- Delete family → 200

---

# 3️⃣ Transaction Tests

Critical for:
- Resident birth event
- Death event
- Move event

Verify:
- If one operation fails → entire transaction rolls back
- No partial data written

Example:
Simulate failure in event creation → Resident should NOT be created.

---

# 4️⃣ Soft Delete Tests

Test:
- After delete, record not returned in list
- Direct DB query shows isActive=false
- Recreate entity with same unique field works (if allowed)

---

# 5️⃣ Audit Log Tests

Test:
- Every CREATE writes audit
- Every UPDATE writes audit
- Every DELETE writes audit
- Transactional operations write audit inside transaction

---

# 6️⃣ Role-Based Access Tests

Test matrix:

Admin:
- Full access

Operator:
- No delete family
- No delete resident

Kepala Desa:
- Read-only

Ensure:
- 403 on restricted action

---

# 7️⃣ Performance Baseline

Test:
- List families with 100+ entries
- Pagination works
- Query response < 300ms local

---

# 8️⃣ Test Database Strategy

Use:
- Separate test database
- Reset DB before each test suite
- Seed minimal required data

Never use production DB for tests.

---

# Coverage Target

Minimum:
- 70% service layer coverage
- 100% critical path coverage

Critical paths:
- Authentication
- Family delete
- Resident lifeStatus change
- Event creation

---

# CI/CD Rule

No merge if:
- Tests failing
- Lint failing
- TypeScript error
