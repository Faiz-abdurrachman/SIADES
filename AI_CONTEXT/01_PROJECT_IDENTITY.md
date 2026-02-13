# 01 — Project Identity

## Project Name
SIADes — Sistem Informasi Administrasi Kependudukan Desa

## System Type
Professional Village Population Administration Backend

## Purpose
Digital system for managing:
- Resident data (data penduduk)
- Family cards (Kartu Keluarga / KK)
- Birth and death records
- Population movement (mutasi penduduk)
- Population statistics aggregation
- Administrative letters (Phase 2)
- Audit trail for all critical actions

## Current State
- PostgreSQL database: created and migrated
- Prisma schema: finalized and locked
- Backend server: implemented (Express + TypeScript)
- Authentication: JWT-based, implemented (login + /me)
- Authorization: role-based middleware, implemented
- Family module: fully implemented (CRUD + soft delete + audit)
- Resident module: fully implemented (birth/move-in creation, status transitions, soft delete + audit)
- Population event module: fully implemented (read-only, events created via resident service transactions)
- Statistics module: fully implemented (yearly/monthly aggregation)
- Integration tests: 6 test suites (resident, statistics, security, conflict, soft-delete, concurrency)
- CI/CD: GitHub Actions (typecheck, test, build)
- Docker: multi-stage Dockerfile + docker-compose
- Letter management: Phase 2

## Stakeholders (Phase 1)
| Role | Description |
|------|-------------|
| Admin Sistem | Full access, manages users and system |
| Operator Desa | Data entry, manages families and residents |
| Kepala Desa | Read access, statistics access, approvals in future phases |

Warga (citizens) will be added in Phase 2.

## Technology Stack (LOCKED)
| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20 |
| Framework | Express.js |
| Language | TypeScript (strict mode) |
| ORM | Prisma v5 |
| Database | PostgreSQL 16 |
| Authentication | JWT (jsonwebtoken) |
| Password Hashing | bcrypt |
| Input Validation | Zod |
| Testing | Jest + Supertest |
| CI/CD | GitHub Actions |
| Containerization | Docker (multi-stage) |
| Architecture | Layered Monolith |

Stack must not be changed without architectural review.
