📘 GOVERNANCE.md
SIADES Backend Engineering Governance
1. PURPOSE

This document defines engineering rules and architectural constraints for the SIADes backend system.

This is a government-grade administrative backend.
It is not a prototype, demo, or tutorial codebase.

All development must follow this document strictly.

2. STACK (LOCKED)

Backend: Node.js
Framework: Express
Language: TypeScript
ORM: Prisma v5
Database: PostgreSQL
Auth: JWT
Hashing: bcrypt
Validation: Zod

Stack must not be changed without architectural review.

3. ARCHITECTURE STYLE

Layered Monolith.

Strict separation:

Route
→ Controller
→ Service
→ Repository
→ Prisma
→ Database

4. LAYER RESPONSIBILITIES
Route

Define endpoints only

No business logic

No Prisma calls

Controller

Parse request

Call service

Return standardized response

No business logic

No Prisma calls

Service

Business logic

Validation enforcement

Transaction control

Domain rules

Repository

Prisma queries only

No business logic

Middleware

Authentication

Authorization

Error handling

5. DATABASE RULES

UUID primary keys only

No auto increment

No hard delete on core entities

Soft delete must be respected

No schema redesign without explicit approval

No direct raw SQL unless critical

6. TRANSACTION POLICY

Transactions are mandatory when:

Creating resident + event

Updating life status + death event

Multi-table writes

Approval workflow (future phase)

Never allow partial commit.

7. AUTHENTICATION POLICY

JWT required

Token expiration mandatory

No plaintext password

bcrypt hashing required

8. AUTHORIZATION POLICY

Role-based middleware only.

Never check role inline in controller.

Allowed roles (Phase 1):

admin

operator

kepala_desa

9. API RESPONSE STANDARD

All endpoints must return:

{
  "success": boolean,
  "message": string,
  "data": object | array | null,
  "error": object | null
}


No raw database error must be returned.

10. VALIDATION POLICY

All input must be validated before business logic.

Validate:

UUID format

Enum values

Required fields

Date format

String length

Reject invalid input early.

11. LOGGING & AUDIT

Every critical action must create AuditLog:

actor

action

entity

entity_id

timestamp

ip_address

Audit log is immutable.

12. PERFORMANCE RULES

Pagination required for list endpoints

Default limit: 20

Max limit: 100

Avoid N+1 query

Use select/include carefully

13. NON-NEGOTIABLE RULES

DO NOT:

Merge Resident and Family

Replace UUID with integer

Remove AuditLog

Collapse relational schema

Skip validation

Skip transaction

Hard delete core entities

Expose raw DB errors

14. AI CONTINUATION POLICY

When switching AI:

Provide PROJECT_CONTEXT.md

Provide GOVERNANCE.md

Provide prisma/schema.prisma

Provide current development state

Lock stack and architecture

AI must confirm understanding before coding.

END OF DOCUMENT