# 10 — AI Control Protocol

## Purpose
Rules for any AI assistant working on this codebase.

## Before Writing Code

1. Read and confirm understanding of:
   - PROJECT_CONTEXT.md (or 01_PROJECT_IDENTITY.md)
   - GOVERNANCE.md (or 02_ARCHITECTURE_CONSTITUTION.md)
   - prisma/schema.prisma (or 03_DATABASE_SCHEMA_FULL.md)
   - 04_CURRENT_IMPLEMENTATION_STATE.md

2. Confirm understanding of:
   - Database schema and relations
   - Layered architecture requirement
   - Non-negotiable constraints
   - Role system
   - Soft delete policy
   - Transaction policy

3. Do NOT generate code until understanding is confirmed.

## During Development

### Architecture Compliance
- Follow layered architecture strictly: Route → Controller → Service → Repository
- No business logic in routes or controllers
- No Prisma calls in controllers
- No validation in controllers
- Transaction control in service layer only
- Prisma queries in repository layer only

### Code Generation Rules
- One file at a time
- Explain reasoning before writing code
- Type-check after each file (`npx tsc --noEmit`)
- Do not generate everything in one response
- Follow established patterns from existing modules

### Schema Rules
- Do NOT modify prisma/schema.prisma unless explicitly instructed
- Use only fields that exist in the schema
- Soft delete uses isActive + deletedAt only — no additional flags
- UUID primary keys only — no auto-increment

### Error Handling
- Use AppError subclasses (ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError)
- Catch P2002 Prisma errors → ConflictError
- Never expose raw database errors
- Forward errors to centralized errorHandler via next()

### Validation
- Zod for all input validation
- Validate UUID format before database calls
- Validate in service layer, not controller
- Pagination: default 20, max 100

## When Switching AI Sessions

Provide to new AI:
1. All files in AI_CONTEXT/
2. Current prisma/schema.prisma
3. Current development state
4. Lock stack and architecture

New AI must confirm understanding before coding.

## Non-Negotiable
- DO NOT simplify the architecture
- DO NOT merge entities
- DO NOT skip validation or transactions
- DO NOT hard delete core entities
- DO NOT expose raw errors
- DO NOT add fields not in the schema
- DO NOT change the technology stack
