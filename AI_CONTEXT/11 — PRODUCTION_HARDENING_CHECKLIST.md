# 11 — Production Hardening Checklist

This document defines steps required before deploying to production.

---

# 1️⃣ Environment Hardening

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

# 2️⃣ Error Handling Hardening

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

# 3️⃣ Rate Limiting

Add:
- express-rate-limit middleware
- Protect:
  - /api/auth/login
  - public endpoints

Reason:
Prevent brute force attacks.

---

# 4️⃣ Input Size Limits

Add:
- express.json({ limit: '1mb' })

Prevent payload abuse.

---

# 5️⃣ Security Headers

Add:
- helmet middleware

Protect against:
- XSS
- Clickjacking
- MIME sniffing

---

# 6️⃣ CORS Configuration

Restrict origins:
- Production frontend domain only

Never use:
app.use(cors())

Without origin restriction in production.

---

# 7️⃣ Database Safety

- Use connection pooling
- Enable Prisma query timeout
- Regular database backups
- Use migration in CI/CD only

---

# 8️⃣ Soft Delete Enforcement Audit

Verify:
- All repository read queries filter isActive: true
- No accidental findUnique without filter

---

# 9️⃣ Transaction Safety Audit

Verify:
- All multi-table operations wrapped in prisma.$transaction
- No side-effect write outside transaction block

---

# 🔟 Logging & Monitoring

Recommended:
- Add request logger middleware
- Add basic health metrics endpoint
- Add uptime monitoring

---

# 1️⃣1️⃣ Deployment Strategy

Recommended:
- Docker container
- PostgreSQL managed service
- Use PM2 or Node cluster mode

---

# Final Production Gate

Before deploy:
- All tests passing
- No TODO comments
- No console.log left
- No debug code
- No hardcoded secrets
