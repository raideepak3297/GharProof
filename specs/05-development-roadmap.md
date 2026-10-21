# GharProof Backend Development Roadmap

This checklist guides AI pair programming through incremental phases. Each phase can be executed autonomously, validated with tests, and verified against specs.

---

## Phase 1: Environment & Project Scaffolding
- [x] Initialize NestJS project in root directory (`@nestjs/core`, `@nestjs/common`, `typescript`, `@nestjs/mongoose`, `mongoose`).
- [x] Set up `@nestjs/config` for environment variables (`PORT`, `MONGO_URI`, `JWT_SECRET`, `UPLOAD_DIR`).
- [x] Configure global validation pipe with `class-validator` and `class-transformer`.
- [x] Set up global error filter (`HttpExceptionFilter`) and standard JSON response interceptor.
- [x] Verify `npm run build` and `npm run start:dev`.

---

## Phase 2: Authentication & User Management (`AuthModule`, `UsersModule`)
- [x] Create `User` schema in Mongoose with indices and role enums (`landlord`, `tenant`, `admin`).
- [x] Implement user registration with `bcrypt` password hashing.
- [x] Implement JWT login and token issuing.
- [x] Build `JwtAuthGuard` and `RolesGuard`.
- [x] Create `GET /auth/me` endpoint.
- [x] Unit tests for `AuthService` and integration tests for auth routes.

---

## Phase 3: Rentals Management (`RentalsModule`)
- [x] Create `Rental` schema with property address, deposit, rent, and status.
- [x] Implement `POST /rentals` (landlord creates rental and specifies tenant invite info).
- [x] Implement `GET /rentals` (list rentals for current user).
- [x] Implement `GET /rentals/:id` (detailed rental info).
- [x] Implement `POST /rentals/:id/accept-invite` (tenant claims tenancy).
- [x] Tests for rental ownership and access authorization.

---

## Phase 4: Inspections & Tamper-Proof Storage (`InspectionsModule`, `StorageModule`)
- [x] Create `Inspection` and `RoomItem` Mongoose schemas.
- [x] Implement `POST /rentals/:rentalId/inspections` (create move-in or move-out inspection).
- [x] Implement `POST /inspections/:id/items` (add room checklist items).
- [x] Set up Multer local storage module.
- [x] Implement `POST /inspections/:id/items/:itemId/photos` with automatic SHA-256 computation and saving.
- [x] Implement `POST /inspections/:id/sign-off`:
  - Handle landlord and tenant agree flags.
  - Compute composite `rootHash` when both sign.
  - Atomically set `status = 'locked'`.
- [x] Enforce immutability guard: block updates or uploads if inspection is locked.
- [x] Unit & E2E tests for inspection locking and hashing accuracy.

---

## Phase 5: Move-Out Inspection & Comparison Engine (`ComparisonModule`)
- [x] Allow creation of `move_out` inspection cloning move-in rooms/items checklist.
- [x] Implement move-out item photo uploads and sign-off locking.
- [x] Implement `GET /rentals/:id/comparison`:
  - Pair move-in items with move-out items by room and item name.
  - Highlight condition changes (`unchanged`, `damaged_since_move_in`, `minor_wear`).
- [x] Tests for diffing logic with mock data.

---

## Phase 6: Dispute Management (`DisputesModule`)
- [x] Create `Dispute` schema for deposit deduction claims.
- [x] Implement `POST /rentals/:id/disputes` (landlord proposes itemized deduction).
- [x] Implement `PATCH /rentals/:id/disputes/:disputeId` (tenant accepts, counters, or disputes).
- [x] Calculate total agreed deductions vs initial deposit amount.
- [x] Tests for dispute transition lifecycle.

---

## Phase 7: Verifiable PDF Export (`ReportsModule`)
- [x] Implement PDF generator using `pdfkit`.
- [x] Design document layout:
  - Header & rental particulars.
  - Move-in and move-out root hashes & tamper-proof timestamps.
  - Side-by-side comparison matrix with photo thumbnails and hashes.
  - Final deposit settlement statement.
- [x] Implement streaming endpoint `GET /rentals/:id/report.pdf`.
- [x] Verify generated PDF output and test endpoint.
