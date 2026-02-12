🔥 OKE. SEKARANG KITA BIKIN VERSI FINAL CLEAN MARKDOWN.

Lu tinggal copy–paste ke file:

SIADES_REBOOT_MASTER_DOC.md


Dan langsung bisa dipakai di Claude Code.

Semua dari 0. Clear. No asumsi lama.

📘 SIADES — FULL REBOOT MASTER DOCUMENT (v1.0)
🔒 CLAUDE PRE-PROMPT (WAJIB DIGUNAKAN)

Gunakan prompt ini sebelum menempelkan dokumen ke Claude Code:

You are starting a backend system from absolute zero.

Only the PostgreSQL database and Prisma schema already exist.

Everything else must be defined from scratch:
- Backend stack
- Architecture
- Folder structure
- Authentication
- Authorization
- Validation
- Logging
- Error handling
- DevOps direction

You must not assume previous decisions.

You must:
- Confirm understanding
- Ask clarification if needed
- Propose architecture with reasoning
- Not redesign database schema
- Follow clean layered architecture

Read the document below carefully before generating any code.

1️⃣ PROJECT IDENTITY

Project Name:
SIADes — Sistem Informasi Administrasi Kependudukan Desa

System Type:
Professional Village Population Administration Backend

Current State:

PostgreSQL database already created

Prisma schema already migrated

No backend server exists

No folder structure

No authentication

No architecture defined

We are starting backend development from zero.

2️⃣ BUSINESS REQUIREMENTS DOCUMENT (BRD)
2.1 Background

Desa membutuhkan sistem digital untuk:

Mengelola data penduduk

Mengelola kartu keluarga (KK)

Mencatat kelahiran dan kematian

Mencatat mutasi penduduk

Mengelola persuratan (fase berikutnya)

Menyediakan audit log

Saat ini proses manual berisiko:

Duplikasi data

Data hilang

Tidak ada histori perubahan

Tidak ada transparansi

2.2 Business Objectives

Sentralisasi data kependudukan

Meningkatkan akurasi data

Mengurangi waktu pelayanan administrasi

Mencatat histori perubahan data

Meningkatkan kontrol internal

2.3 Stakeholders (Internal Phase 1)

Admin Sistem

Operator Desa

Kepala Desa

Warga akan ditambahkan di Phase 2.

3️⃣ PRODUCT REQUIREMENTS DOCUMENT (PRD)
3.1 Phase 1 Scope (Core Population System)
🔐 Authentication & Authorization

Register user (admin only)

Login

JWT-based authentication

Role-based access control

👨‍👩‍👧 Family Management

Create KK

Update KK

Soft delete KK

List KK with pagination

🧍 Resident Management

Create resident

Update resident

Change life status (alive/deceased)

Change domicile status (permanent/moved)

Soft delete resident

List residents with pagination

📊 Population Event

Record birth

Record death

Record move-in

Record move-out

Each critical action must create audit log.

3.2 Non-Functional Requirements

UUID primary keys only

No hard delete on core entities

Input validation required

Centralized error handling

Pagination mandatory

No raw DB errors exposed

Transaction used for multi-step operations

4️⃣ EXISTING DATABASE (LOCKED)

Database: PostgreSQL
ORM: Prisma v5
Migration: Completed

Entities:

Role

User

Family

Resident

PopulationEvent

LetterType

LetterRequest

Document

DigitalSignature

AuditLog

Constraints:

UUID primary keys

Enums defined

Relations finalized

Soft delete supported

Database schema must NOT be redesigned unless critical.

5️⃣ ARCHITECTURE REQUIREMENTS
5.1 Architecture Style

Layered Monolith with clean separation:

Route
→ Controller
→ Service
→ Repository
→ Prisma
→ PostgreSQL

5.2 Folder Structure
src/
  app.ts
  server.ts
  config/
  modules/
    auth/
    family/
    resident/
    event/
  middleware/
  utils/
  validators/

5.3 Separation Rules

Route:

Only define endpoints

Controller:

Parse request

Call service

Return response

Service:

Business logic

Validation

Transaction

Repository:

Prisma queries only

Middleware:

Auth

Role

Error handler

6️⃣ AUTHENTICATION MODEL
6.1 Login Flow

Validate email

Compare password using bcrypt

Generate JWT

Return token

6.2 JWT Payload
{
  "userId": "uuid",
  "role": "admin | operator | kepala_desa",
  "iat": 123456,
  "exp": 123456
}


JWT expiration required.

7️⃣ AUTHORIZATION MODEL

Middleware pattern:

checkAuth
checkRole(['admin'])
checkRole(['operator'])
checkRole(['kepala_desa'])


No inline role logic inside controller.

8️⃣ API RESPONSE STANDARD

All endpoints must return:

{
  "success": true,
  "message": "string",
  "data": {},
  "error": null
}

9️⃣ TRANSACTION POLICY

Use Prisma transaction for:

Create resident + create event

Update life status + create death event

Delete family with residents check

Never allow partial commit.

🔟 ERROR HANDLING POLICY

Centralized error middleware.

Error types:

ValidationError

AuthenticationError

AuthorizationError

NotFoundError

ConflictError

InternalServerError

Never expose raw Prisma error.

1️⃣1️⃣ VALIDATION STRATEGY

Validate before service layer:

Required fields

UUID format

Enum values

Date format

String length

Reject invalid input early.

1️⃣2️⃣ LOGGING STRATEGY

Every critical action must create AuditLog:

actor

action

table

record_id

timestamp

ip_address

Audit logs immutable.

1️⃣3️⃣ DEVELOPMENT ORDER

Decide language (JS or TypeScript)

Setup project

Setup Prisma

Setup Express

Setup Auth module

Implement Family CRUD

Implement Resident CRUD

Implement Event logic

No premature letter module.