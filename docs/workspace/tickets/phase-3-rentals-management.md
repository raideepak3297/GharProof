# Ticket: Phase 3 — Rentals Management (`RentalsModule`)

**Date:** 2026-10-19  
**Status:** Completed  
**Author:** AI Pair Programmer & Deepak Rai  

---

## Plan & Acceptance Criteria

### Acceptance Criteria
- [x] Create `Rental` Mongoose schema in `src/modules/rentals/schemas/rental.schema.ts` with indices and `toJSON` transform.
- [x] Define all module interfaces strictly in `src/modules/rentals/interfaces/rental.interface.ts`.
- [x] Use centralized `RentalStatus` from `src/common/enums/index.ts`.
- [x] Follow Option A standard for controllers (`@CurrentUser() user: JwtPayload`).
- [x] DTOs with `class-validator` for nested address and rental creation/update.
- [x] Implement `RentalsService`:
  - `create`: Landlord creates rental, sets status to `INVITED` if email provided, else `DRAFT`.
  - `findAllForUser`: Finds rentals where user is landlord, tenant, or invited tenant (`.lean()`).
  - `findByIdWithAuth`: Fetches rental and verifies user authorization.
  - `acceptInvite`: Tenant accepts invite, verifying matching email, transitions status to `ACTIVE`.
- [x] Implement `RentalsController`:
  - `POST /api/v1/rentals` (Landlord only)
  - `GET /api/v1/rentals` (Landlord / Tenant)
  - `GET /api/v1/rentals/:id` (Authorized parties)
  - `POST /api/v1/rentals/:id/accept-invite` (Tenant only)
- [x] Wire `RentalsModule` into `AppModule`.
- [x] Unit tests for `RentalsService` with mock Mongoose models.

---

## Update: 2026-10-19 18:11 — Implementation Complete

### Summary of Changes:
- **Interfaces:** Created `src/modules/rentals/interfaces/rental.interface.ts` defining `IPropertyAddress`, `IRental`, `ICreateRentalInput`, `IUpdateRentalInput`, and `IRentalDetailResponse`.
- **Schemas:** Created `src/modules/rentals/schemas/rental.schema.ts` with subdocument `PropertyAddress`, timestamps, compound indexes (`{ landlordId: 1, status: 1 }`, `{ tenantId: 1, status: 1 }`, `{ tenantInviteEmail: 1, status: 1 }`), and `toJSON` transform stripping `__v`.
- **DTOs:** Created `PropertyAddressDto`, `CreateRentalDto`, `UpdateRentalDto`, and `RentalResponseDto` / `RentalDetailResponseDto`.
- **Service:** Implemented `RentalsService` with positive rent/deposit validations, date range check (`endDate > startDate`), status calculation, lean queries for listing, authorization check on single rental retrieval, and atomic tenancy acceptance.
- **Controller:** Implemented `RentalsController` adhering strictly to Option A (`@CurrentUser() user: JwtPayload`) and role annotations (`@Roles(Role.LANDLORD)`, `@Roles(Role.TENANT)`).
- **Module:** Registered and exported in `RentalsModule`, wired into `AppModule`.

### Verification:
- `npm run format`: Clean.
- `npm run build`: 0 errors.
- `npm test`: 25/25 unit tests passing across 4 suites (`RentalsService`, `AuthService`, `UsersService`, `AppController`).
- `npm run test:e2e`: 5/5 tests passing across 2 suites (`AppController`, `RentalsController`).
- Live API execution on running NestJS + MongoDB verified: landlord registration -> rental creation (`status: 'invited'`) -> tenant list discovery -> invite acceptance (`status: 'active'`, `tenantId` linked) -> detail query.

### Files Touched:
- `src/modules/rentals/interfaces/rental.interface.ts`
- `src/modules/rentals/schemas/rental.schema.ts`
- `src/modules/rentals/dto/property-address.dto.ts`
- `src/modules/rentals/dto/create-rental.dto.ts`
- `src/modules/rentals/dto/update-rental.dto.ts`
- `src/modules/rentals/dto/rental-response.dto.ts`
- `src/modules/rentals/rentals.service.ts`
- `src/modules/rentals/rentals.controller.ts`
- `src/modules/rentals/rentals.module.ts`
- `src/modules/rentals/rentals.service.spec.ts`
- `src/app.module.ts`
- `test/rentals.e2e-spec.ts`
- `docs/workspace/tickets/phase-3-rentals-management.md`

---

## Update: 2026-10-19 18:52 — Architecture Refactoring & DAL Standardization

### Summary of Architectural Decisions & Alignments:
- **Centralized Schemas in `src/mongoDb/schema/`:**
  - Moved schemas out of module folders into `src/mongoDb/schema/` (`rental.schema.ts`, `user.schema.ts`).
  - Added both `toJSON` and `toObject` transforms to strip `__v` and sensitive fields.
- **Dedicated Mongo DAL Services (`src/mongoDb/mongo-db-<entity>.service.ts`):**
  - All direct Mongoose interactions (`find`, `findById`, `create`, `lean()`) moved into `MongoDbUserService` and `MongoDbRentalService`.
  - Feature domain services (`RentalsService`, `UsersService`) inject these DAL services rather than `@InjectModel()`.
- **Eliminated `toResponseDto` helper:**
  - Removed manual DTO mapper functions; services return domain interfaces directly (`Promise<IRental>`) via `.toObject()` or `.lean()`.
- **Route-level Guard Application:**
  - Removed class-level guards in controllers in favor of explicit handler-level guards (`@UseGuards(JwtAuthGuard)` or `@UseGuards(JwtAuthGuard, RolesGuard)`).
- **`POPULATE_TAB` Placement Convention:**
  - Configured `POPULATE_TAB` at the very bottom of `src/mongoDb/mongo-db-rental.service.ts` after the class definition.
  - Enforced this rule across `AGENTS.md`, `docs/CODEBASE_CONVENTIONS.md`, and skills.
- **Model Tokens & Factory Providers (`@Inject(MODEL_TOKEN)`):**
  - Replaced `@InjectModel(...)` and `MongooseModule.forFeature(...)` across the project with fanfare standard.
  - Defined model tokens in `src/mongoDb/type/constant.ts` (`USER_MODEL`, `RENTAL_MODEL`, `MONGODB_CONNECTION`).
  - `MongoDbModule` provides models via connection factory providers and injects them in MongoDB services using `@Inject(RENTAL_MODEL)`.

