# 11 — Production Hardening Checklist

This document defines steps required before deploying to production.

---

# 1. Environment Hardening

## Required
- NODE_ENV=production
- Strong JWT_SECRET (32+ random characters)
- DATABASE_URL secured
- Disable Prisma debug logs in production
- Enable HTTPS (reverse proxy like Nginx)

## Must NOT
- Commit .env
- Log JWT secrets
- Log password hashes

---

# 2. Error Handling Hardening

## Production Mode Rules
- No stack traces in API response
- Generic message for 500 errors
- Detailed error logs only on server side

Recommended:
- Add structured logging (Winston or Pino)
- Log:
  - timestamp
  - route
  - userId
  - error type

---

# 3. Rate Limiting

Add:
- express-rate-limit middleware
- Protect:
  - /api/auth/login
  - public endpoints

Reason:
Prevent brute force attacks.

---

# 4. Input Size Limits

Add:
- express.json({ limit: '1mb' })

Prevent payload abuse.

---

# 5. Security Headers

Add:
- helmet middleware

Protect against:
- XSS
- Clickjacking
- MIME sniffing

---

# 6. CORS Configuration

Restrict origins:
- Production frontend domain only

Never use:
app.use(cors())

Without origin restriction in production.

---

# 7. Database Safety

- Use connection pooling
- Enable Prisma query timeout
- Regular database backups
- Use migration in CI/CD only

---

# 8. Soft Delete Enforcement Audit

Verify:
- All repository read queries filter isActive: true
- No accidental findUnique without filter

Current status: All family and resident repository reads enforce isActive: true.

---

# 9. Transaction Safety Audit

Verify:
- All multi-table operations wrapped in prisma.$transaction
- No side-effect write outside transaction block

Current status: All multi-table operations (resident create, status change, delete) use prisma.$transaction.

---

# 10. Logging & Monitoring

Recommended:
- Add request logger middleware
- Add basic health metrics endpoint
- Add uptime monitoring

Current: GET /api/health exists (checks DB connection).

---

# 11. Deployment Strategy

Current:
- Docker multi-stage build (node:20-alpine)
- Non-root user in container
- docker-compose with postgres service
- prisma migrate deploy runs on container start

Recommended additions:
- PostgreSQL managed service (production)
- Use PM2 or Node cluster mode
- Container orchestration (Docker Swarm or K8s)

---

# Final Production Gate

Before deploy:
- All tests passing (6 integration test suites)
- CI/CD pipeline green (typecheck + test + build)
- No TODO comments
- No console.log left
- No debug code
- No hardcoded secrets
- Coverage thresholds met (branches 80%, functions 85%, lines 90%, statements 90%)
