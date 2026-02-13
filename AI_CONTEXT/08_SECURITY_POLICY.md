# 08 — Security Policy

## Authentication

### Method
JWT (JSON Web Token) via Authorization header.

### Token Format
```
Authorization: Bearer <token>
```

### JWT Payload
```json
{
  "userId": "uuid",
  "role": "admin | operator | kepala_desa",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Rules
- Token expiration is mandatory (configured via JWT_EXPIRES_IN env var)
- No plaintext passwords anywhere — bcrypt hashing required
- JWT secret must be stored in environment variable, never hardcoded
- Token verification via authenticate middleware before any protected route

## Authorization

### Method
Role-based access control via middleware.

### Middleware Chain
```
authenticate → authorize(['role1', 'role2']) → controller
```

### Role Permissions (Phase 1)
| Action | admin | operator | kepala_desa |
|--------|-------|----------|-------------|
| Login | yes | yes | yes |
| View own profile (GET /me) | yes | yes | yes |
| Create family | yes | yes | no |
| Read families | yes | yes | yes |
| Update family | yes | yes | no |
| Delete family | yes | no | no |
| Create resident (birth/move-in) | yes | yes | no |
| Read residents | yes | yes | yes |
| Update resident | yes | yes | no |
| Patch life status | yes | yes | no |
| Patch domicile status | yes | yes | no |
| Delete resident | yes | no | no |
| Read events | yes | yes | yes |
| View statistics | yes | no | yes |

### Rules
- No inline role checking in controllers or services
- Authorization is middleware only
- Insufficient permissions return 403 (AuthorizationError)
- Missing/invalid token returns 401 (AuthenticationError)

## Password Policy
- Passwords hashed with bcrypt (salt rounds: 10)
- Plain text never stored in database
- Login failure messages are generic ("Invalid email or password") to prevent user enumeration

## Error Security
- Raw database errors never exposed to client
- Prisma errors caught and mapped to AppError subclasses
- Stack traces not included in production responses
- Internal server errors return generic message

## Environment Security
- DATABASE_URL, JWT_SECRET stored in .env
- .env excluded from version control via .gitignore
- Environment variables validated at startup (fail-fast)
