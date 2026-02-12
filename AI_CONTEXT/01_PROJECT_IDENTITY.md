# 01 — Project Identity

## Project Name
SIADes — Sistem Informasi Administrasi Kependudukan Desa
a
## System Type
Professional Village Population Administration Backend

## Purpose
Digital system for managing:
- Resident data (data penduduk)
- Family cards (Kartu Keluarga / KK)
- Birth and death records
- Population movement (mutasi penduduk)
- Administrative letters (Phase 2)
- Audit trail for all critical actions

## Current State
- PostgreSQL database: created and migrated
- Prisma schema: finalized and locked
- Backend server: implemented (Express + TypeScript)
- Authentication: JWT-based, implemented
- Authorization: role-based middleware, implemented
- Family module: fully implemented (CRUD + soft delete + audit)
- Resident module: not yet implemented
- Population event module: not yet implemented
- Letter management: Phase 2

## Stakeholders (Phase 1)
| Role | Description |
|------|-------------|
| Admin Sistem | Full access, manages users and system |
| Operator Desa | Data entry, manages families and residents |
| Kepala Desa | Read access, approvals in future phases |

Warga (citizens) will be added in Phase 2.

## Technology Stack (LOCKED)
| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript (strict mode) |
| ORM | Prisma v5 |
| Database | PostgreSQL |
| Authentication | JWT (jsonwebtoken) |
| Password Hashing | bcrypt |
| Input Validation | Zod |
| Architecture | Layered Monolith |

Stack must not be changed without architectural review.
