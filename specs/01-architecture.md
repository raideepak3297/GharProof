# GharProof Backend Architecture Specification

## 1. Overview
GharProof Backend is a RESTful API built on NestJS and MongoDB. Its mission is to handle rental property condition inspections, tamper-proof media storage with SHA-256 fingerprinting, dual-party sign-offs, move-in vs move-out comparison reports, dispute resolutions, and verifiable PDF exports.

---

## 2. Technology Stack

| Layer | Component | Details |
|---|---|---|
| **Framework** | NestJS 10.x | Node.js modular framework (TypeScript) |
| **Database** | MongoDB (via Mongoose) | Document-oriented storage for flexible checklists & nested snapshots |
| **Authentication** | Passport & `@nestjs/jwt` | Stateless JWT authentication, role guards (`landlord`, `tenant`) |
| **Validation** | `class-validator`, `class-transformer` | Strict DTO validation pipe |
| **File Storage** | Multer (Local disk storage) | Stored with timestamped, sanitized filenames; easily abstracted for S3/MinIO |
| **Cryptography** | Node.js `crypto` | SHA-256 computation on image streams & inspection state trees |
| **Document Export** | `pdfkit` | Lightweight server-side tamper-proof PDF streaming |

---

## 3. High-Level Modular Design

```text
src/
├── main.ts                          # Bootstrap, global pipes, CORS, Swagger setup
├── app.module.ts                    # Root module connecting Config, Database, and feature modules
├── common/                          # Cross-cutting concerns
│   ├── decorators/                  # @CurrentUser(), @Roles()
│   ├── filters/                     # Global HttpExceptionFilter
│   ├── guards/                      # JwtAuthGuard, RolesGuard
│   ├── interceptors/                # TransformInterceptor, LoggingInterceptor
│   └── utils/                       # Hashing utils, canonical serializers
├── config/                          # Environment config validation (Joi or class-validator)
└── modules/
    ├── auth/                        # Registration, login, JWT issuance, password hashing
    ├── users/                       # Profile management, roles
    ├── rentals/                     # Property creation, tenant invitations, rental lifecycle
    ├── inspections/                 # Move-in & move-out inspections, checklists, photo uploads, sign-offs
    ├── comparison/                  # Move-in vs move-out diff engine
    ├── disputes/                    # Deposit deductions, tenant disputes, acceptances
    ├── reports/                     # Tamper-proof PDF generation & download
    └── storage/                     # Local media persistence & SHA-256 calculation
```

---

## 4. Layered Request/Response Flow

1. **Client Request**: Authenticated with `Bearer <JWT>`.
2. **Guards & Interceptors**:
   - `JwtAuthGuard` authenticates user identity.
   - `RolesGuard` checks whether user is a `landlord` or `tenant`.
3. **Controller**:
   - Validates input body against strict DTO (`ValidationPipe`).
   - Forwards request to the appropriate Service.
4. **Service**:
   - Executes core business rules.
   - Enforces lock state checks (e.g. modifying an inspection with `status === 'locked'` throws `ForbiddenException`).
   - Calculates cryptographic SHA-256 hashes on media or state snapshots.
   - Interacts with Mongoose Models.
5. **Persistence (MongoDB)**:
   - Stores documents across collections: `users`, `rentals`, `inspections`, `room_items`, `disputes`.
6. **Response**: Clean, structured JSON output conforming to REST standards.
