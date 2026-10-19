# phase-2-auth-users: Authentication & User Management (Landlord & Tenant)

_Created: 2026-10-19 16:55 by Deepak_
_Repo: GharProof_

## Plan

### Task
`phase-2-auth-users` — Implement User entity, password hashing, JWT authentication, and role authorization strictly for Landlord and Tenant roles (excluding admin flow).

### Acceptance Criteria
- [x] User Mongoose schema in `users` collection:
  - Fields: `name`, `email` (unique, lowercase, indexed), `phone` (indexed), `passwordHash`, `role` (`'landlord'` | `'tenant'`), `timestamps: true`.
  - Sensitive fields stripped on serialization (no `passwordHash` or `__v` exposed in API responses).
- [x] DTOs with `class-validator` & `class-transformer`:
  - `RegisterDto`: `name`, `email`, `phone`, `password` (min 8 chars), `role` (`Role.LANDLORD` | `Role.TENANT`).
  - `LoginDto`: `email`, `password`.
  - `UserResponseDto` / clean user object.
- [x] Endpoints under `/api/v1/auth`:
  - `POST /auth/register`:
    - Checks for existing user by email. Throws `ConflictException('Email already registered')` if found.
    - Hashes password using `bcrypt` (salt rounds: 10).
    - Persists user and returns `accessToken` + user profile.
  - `POST /auth/login`:
    - Validates email and password using `bcrypt.compare`.
    - Throws `UnauthorizedException('Invalid credentials')` on mismatch (avoids revealing whether email exists).
    - Returns `accessToken` + user profile.
  - `GET /auth/me`:
    - Protected with `JwtAuthGuard`.
    - Returns authenticated user details from `@CurrentUser()`.
- [x] Security, Guards & Decorators in `src/common/`:
  - `JwtStrategy` configured using `JWT_SECRET` from `ConfigService`.
  - `JwtAuthGuard` protecting endpoints by default (or applied to authenticated routes).
  - `@Public()` decorator to bypass JWT guard for `/auth/register`, `/auth/login`, and `/health`.
  - `@CurrentUser()` parameter decorator to extract `{ userId, email, role }`.
  - `@Roles()` decorator and `RolesGuard` to enforce `landlord` vs `tenant` permissions.
- [x] Scope Constraint:
  - Exclude admin flow completely (only `Role.LANDLORD` and `Role.TENANT`).
- [x] Testing & Build:
  - Unit tests for `UsersService` mocking Mongoose `getModelToken(User.name)`.
  - Unit tests for `AuthService` testing registration, login, and token generation.
  - `npm run build` and `npm test` passing with zero errors.

### Files to Change / Create
- **Common Guards & Decorators (`src/common/`):**
  - `src/common/decorators/current-user.decorator.ts` — extracts authenticated user from request
  - `src/common/decorators/roles.decorator.ts` — sets allowed roles metadata
  - `src/common/decorators/public.decorator.ts` — marks public routes
  - `src/common/guards/jwt-auth.guard.ts` — handles JWT verification
  - `src/common/guards/roles.guard.ts` — checks user role against required roles
- **Users Domain (`src/modules/users/`):**
  - `src/modules/users/schemas/user.schema.ts` — Mongoose schema for users collection
  - `src/modules/users/enums/role.enum.ts` — `Role` enum (`LANDLORD`, `TENANT`)
  - `src/modules/users/dto/create-user.dto.ts` — internal user creation DTO
  - `src/modules/users/users.service.ts` — user lookup and persistence
  - `src/modules/users/users.module.ts` — exports `UsersService` and Mongoose model
  - `src/modules/users/users.service.spec.ts` — unit tests with mocked model
- **Auth Domain (`src/modules/auth/`):**
  - `src/modules/auth/dto/register.dto.ts` — registration input validation
  - `src/modules/auth/dto/login.dto.ts` — login input validation
  - `src/modules/auth/strategies/jwt.strategy.ts` — Passport JWT strategy
  - `src/modules/auth/auth.controller.ts` — register, login, me endpoints
  - `src/modules/auth/auth.service.ts` — authentication business logic & bcrypt hashing
  - `src/modules/auth/auth.module.ts` — wires JwtModule, PassportModule, and UsersModule
  - `src/modules/auth/auth.service.spec.ts` — unit tests
- **Root Wiring (`src/app.module.ts`):**
  - Wire `UsersModule` and `AuthModule` into root `AppModule`.

### Logic Changes
- Introduces password hashing, token generation, user persistence, and role-based access control.

### Blast Radius
- Future modules (`rentals`, `inspections`, `disputes`) will depend on `JwtAuthGuard`, `@CurrentUser()`, and `@Roles()` for authorization.

### Edge Cases
- **Duplicate Registration**: Handled with `ConflictException`.
- **Case-insensitive email**: Email normalized to lowercase before lookup or creation.
- **Malformed JWT**: Rejected with 401 Unauthorized by `JwtAuthGuard`.
- **Role tampering**: Validated strictly via `IsEnum(Role)` to prevent injecting arbitrary roles.

### Risks
- Password security: `bcrypt` salt rounds set to 10 (balanced performance and security).
- Token expiry: Configurable via `JWT_EXPIRES_IN` (default 7 days).

### Clarifying Questions
- None. Requirements are clear and bounded (strictly Landlord and Tenant, no Admin flow).

---

## Update: 2026-10-19 17:03 — Deepak

### What was completed:
- `Role` enum defined with strictly `LANDLORD` and `TENANT`.
- `User` Mongoose schema created with `unique`, `lowercase` email, trimmed fields, and `toJSON` transform stripping `passwordHash` and `__v`.
- `UsersService` implemented with `create`, `findByEmail`, `findById`, and `findCleanById`.
- `UsersModule` registered with Mongoose schema and exported.
- Common decorators & guards created: `@Public()`, `@Roles()`, `@CurrentUser()`, `JwtAuthGuard`, `RolesGuard`.
- `RegisterDto` (with validation on name, email, phone, min 8-char password, and Role enum) and `LoginDto`.
- `AuthService` implemented with bcrypt password hashing (10 salt rounds), credential verification, and JWT generation.
- `AuthController` implemented with public `/auth/register`, `/auth/login`, and protected `/auth/me`.
- Unit tests written for both `UsersService` and `AuthService`, all passing (10 total tests across project).
- `npm run build` and `npm test` verified with 0 errors.

### Files Touched:
- `src/modules/users/enums/role.enum.ts`
- `src/modules/users/schemas/user.schema.ts`
- `src/modules/users/dto/create-user.dto.ts`
- `src/modules/users/users.service.ts`
- `src/modules/users/users.module.ts`
- `src/modules/users/users.service.spec.ts`
- `src/common/decorators/public.decorator.ts`
- `src/common/decorators/roles.decorator.ts`
- `src/common/decorators/current-user.decorator.ts`
- `src/common/guards/jwt-auth.guard.ts`
- `src/common/guards/roles.guard.ts`
- `src/modules/auth/dto/register.dto.ts`
- `src/modules/auth/dto/login.dto.ts`
- `src/modules/auth/strategies/jwt.strategy.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/auth.controller.ts`
- `src/modules/auth/auth.module.ts`
- `src/modules/auth/auth.service.spec.ts`
- `src/app.module.ts`
