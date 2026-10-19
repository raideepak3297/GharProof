# GharProof Backend Development Roadmap

This checklist guides AI pair programming through incremental phases. Each phase can be executed autonomously, validated with tests, and verified against specs.

---

## Phase 1: Environment & Project Scaffolding
- [ ] Initialize NestJS project in root directory (`@nestjs/core`, `@nestjs/common`, `typescript`, `@nestjs/mongoose`, `mongoose`).
- [ ] Set up `@nestjs/config` for environment variables (`PORT`, `MONGO_URI`, `JWT_SECRET`, `UPLOAD_DIR`).
- [ ] Configure global validation pipe with `class-validator` and `class-transformer`.
- [ ] Set up global error filter (`HttpExceptionFilter`) and standard JSON response interceptor.
- [ ] Verify `npm run build` and `npm run start:dev`.

---

## Phase 2: Authentication & User Management (`AuthModule`, `UsersModule`)
- [ ] Create `User` schema in Mongoose with indices and role enums (`landlord`, `tenant`, `admin`).
- [ ] Implement user registration with `bcrypt` password hashing.
- [ ] Implement JWT login and token issuing.
- [ ] Build `JwtAuthGuard` and `RolesGuard`.
- [ ] Create `GET /auth/me` endpoint.
- [ ] Unit tests for `AuthService` and integration tests for auth routes.

---

## Phase 3: Rentals Management (`RentalsModule`)
- [ ] Create `Rental` schema with property address, deposit, rent, and status.
- [ ] Implement `POST /rentals` (landlord creates rental and specifies tenant invite info).
- [ ] Implement `GET /rentals` (list rentals for current user).
- [ ] Implement `GET /rentals/:id` (detailed rental info).
- [ ] Implement `POST /rentals/:id/accept-invite` (tenant claims tenancy).
- [ ] Tests for rental ownership and access authorization.

---

## Phase 4: Inspections & Tamper-Proof Storage (`InspectionsModule`, `StorageModule`)
- [ ] Create `Inspection` and `RoomItem` Mongoose schemas.
- [ ] Implement `POST /rentals/:rentalId/inspections` (create move-in or move-out inspection).
- [ ] Implement `POST /inspections/:id/items` (add room checklist items).
- [ ] Set up Multer local storage module.
- [ ] Implement `POST /inspections/:id/items/:itemId/photos` with automatic SHA-256 computation and saving.
- [ ] Implement `POST /inspections/:id/sign-off`:
  - Handle landlord and tenant agree flags.
  - Compute composite `rootHash` when both sign.
  - Atomically set `status = 'locked'`.
- [ ] Enforce immutability guard: block updates or uploads if inspection is locked.
- [ ] Unit & E2E tests for inspection locking and hashing accuracy.

---

## Phase 5: Move-Out Inspection & Comparison Engine (`ComparisonModule`)
- [ ] Allow creation of `move_out` inspection cloning move-in rooms/items checklist.
- [ ] Implement move-out item photo uploads and sign-off locking.
- [ ] Implement `GET /rentals/:id/comparison`:
  - Pair move-in items with move-out items by room and item name.
  - Highlight condition changes (`unchanged`, `damaged_since_move_in`, `minor_wear`).
- [ ] Tests for diffing logic with mock data.

---

## Phase 6: Dispute Management (`DisputesModule`)
- [ ] Create `Dispute` schema for deposit deduction claims.
- [ ] Implement `POST /rentals/:id/disputes` (landlord proposes itemized deduction).
- [ ] Implement `PATCH /rentals/:id/disputes/:disputeId` (tenant accepts, counters, or disputes).
- [ ] Calculate total agreed deductions vs initial deposit amount.
- [ ] Tests for dispute transition lifecycle.

---

## Phase 7: Verifiable PDF Export (`ReportsModule`)
- [ ] Implement PDF generator using `pdfkit`.
- [ ] Design document layout:
  - Header & rental particulars.
  - Move-in and move-out root hashes & tamper-proof timestamps.
  - Side-by-side comparison matrix with photo thumbnails and hashes.
  - Final deposit settlement statement.
- [ ] Implement streaming endpoint `GET /rentals/:id/report.pdf`.
- [ ] Verify generated PDF output and test endpoint.
