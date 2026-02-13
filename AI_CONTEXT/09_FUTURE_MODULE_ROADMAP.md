# 09 — Future Module Roadmap

## Phase 1 — Core Population System (COMPLETE)

### Completed
- [x] Project bootstrap (TypeScript, Express, Prisma)
- [x] Authentication module (login, JWT, /me)
- [x] Authorization middleware (role-based)
- [x] Family CRUD module (with soft delete + audit)
- [x] Seed data (roles + admin user)
- [x] Resident module (birth/move-in creation, status transitions, soft delete + audit)
- [x] Population event module (read-only, events created via resident transactions)
- [x] Statistics module (yearly/monthly aggregation by event type)
- [x] Integration test suite (6 test files)
- [x] CI/CD pipeline (GitHub Actions: typecheck, test, build)
- [x] Docker deployment (multi-stage Dockerfile + docker-compose)

### Remaining in Phase 1
- [ ] User registration endpoint (admin only)
- [ ] User management CRUD (admin only)

## Phase 2 — Letter Management

### Models (Already in Schema)
- LetterType — types of administrative letters
- LetterRequest — citizen requests for letters
- Document — supporting documents
- DigitalSignature — digital signatures for approved letters

### Planned Features
- Letter type management (admin)
- Letter request submission
- Operator verification workflow
- Kepala Desa approval workflow
- Document upload
- Digital signature generation
- QR code verification
- Status tracking (pending → verified → approved/rejected)

### Endpoints (Planned)
- CRUD for LetterType
- CRUD for LetterRequest
- PATCH for status transitions
- File upload for documents
- Signature generation

## Phase 3 — Citizen Portal (Future)

### Planned Features
- Citizen self-registration
- Letter request by citizens
- Status tracking for citizens
- Public verification endpoint (QR code)

### New Role
- warga (citizen) role to be added

## Phase 4 — Analytics & Reporting (Future)

### Planned Features
- Population statistics dashboard (basic version done in Phase 1)
- Demographic reports
- Event history reports
- Letter processing metrics

## Implementation Principles
- Each phase builds on previous phase infrastructure
- No premature module implementation
- Schema already supports Phase 2 (letter models exist)
- Architecture must remain consistent across phases
- All governance rules apply to all phases
