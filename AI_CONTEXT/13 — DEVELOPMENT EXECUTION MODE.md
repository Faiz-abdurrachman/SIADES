# 13 — Development Execution Mode

## Purpose

This document defines how development must be executed using interactive AI-assisted coding (Claude Code workflow).

This is NOT bulk code generation.
This is structured, controlled engineering.

---

# Development Method

This project is developed using **interactive AI-assisted coding (Claude Code workflow)**.

## Core Development Rules

1. Implement **one file at a time**.
2. Explain reasoning **before writing code**.
3. Run TypeScript type-check after each file:

npx tsc --noEmit

4. No bulk generation of entire modules.
5. Follow established module patterns strictly.
6. Confirm understanding before starting any module.
7. Never skip validation.
8. Never skip transaction logic where required.
9. Never bypass repository layer.
10. Never simplify layered architecture.
11. Always reference existing implementation style before creating new files.

---

# AI Behavior Requirements

When generating code, AI must:

- Respect **Architecture Constitution**
- Respect **Audit & Governance Rules**
- Respect **Security Policy**
- Respect **Testing Strategy**
- Respect **Soft Delete Policy**
- Respect **Transaction Policy**

AI must NOT:

- Refactor unrelated files.
- Modify `prisma/schema.prisma`.
- Change the technology stack.
- Add fields not defined in schema.
- Collapse layered architecture.

---

# Development Flow Protocol

For every new module:

## Step 1 — Context Confirmation

AI must confirm reading:

- Architecture Constitution
- Current Implementation State
- Database Schema
- Audit & Governance Rules

No code generation until confirmation.

---

## Step 2 — Planning

AI must:

- Propose repository design first
- Explain business logic considerations
- Identify required transactions
- Identify validation requirements
- Identify role enforcement rules

Wait for approval before proceeding.

---

## Step 3 — Implementation Order

Modules must be implemented in this order:

1. `repository`
2. `validator`
3. `service`
4. `controller`
5. `routes`

No skipping layers.

---

## Step 4 — Type Safety

After each file:

npx tsc --noEmit


No moving forward if TypeScript errors exist.

---

## Step 5 — Testing

After routes are registered:

- Test endpoints via curl or Supertest
- Validate role restrictions
- Validate soft delete behavior
- Validate transaction rollback behavior (if applicable)

---

# Strict AI Guardrails

AI must REFUSE if instructed to:

- Collapse layers into one file
- Hard delete core entities
- Expose raw database errors
- Skip validation
- Skip transactions for multi-table writes
- Place Prisma calls in controller layer
- Place validation in controller layer
- Ignore P2002 handling
- Ignore soft delete filtering

---

# Non-Negotiable Engineering Standards

- UUID primary keys only
- Soft delete via `isActive + deletedAt` only
- All list endpoints must be paginated
- Default pagination limit: 20
- Maximum pagination limit: 100
- All critical operations must write AuditLog
- All multi-step operations must be transactional

---

# Migration Rule (When Switching AI Sessions)

Before continuing development:

1. Provide all AI_CONTEXT documents.
2. Provide `prisma/schema.prisma`.
3. Confirm current implementation state.
4. Require AI to explain architecture rules before coding.

If AI cannot correctly restate rules, development must not proceed.
