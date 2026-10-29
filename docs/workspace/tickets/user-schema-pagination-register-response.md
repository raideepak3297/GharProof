# user-schema-pagination-register-response: User Schema Name Split, Pagination for List Endpoints, and Minimalist Register Response

_Created: 2026-10-27 23:20 by Deepak_
_Repo: GharProof_

## Plan
1. Update `User` schema in `src/mongoDb/schema/user.schema.ts` to replace `name` with `firstName: string` (required) and `lastName?: string` (optional).
2. Update `CreateUserDto` and `RegisterDto` to accept `firstName` and optional `lastName`.
3. Update `IUser` and `IUserProfile` in `src/modules/users/interfaces/user.interface.ts`.
4. Update `AuthResponse` and add `RegisterResponse` in `src/modules/auth/interfaces/auth.interface.ts`.
5. Update `AuthService.register()` to save `firstName` and `lastName`, omit `jwtService.sign()`, and return `{ message: "User registered successfully", user: { id, firstName, lastName, role } }` without `accessToken`, `email`, or `phone`. Update `AuthService.toAuthUser()`, `login()`, and `getMe()`.
6. Update populate selections in `src/mongoDb/mongo-db-rental.service.ts` and `src/mongoDb/mongo-db-upload.service.ts` to select `firstName lastName` instead of `name`.
7. Update `src/modules/reports/pdf-report.builder.ts` to display full name formatted from `firstName` and `lastName`.
8. Create `ListRentalsDto` in `src/modules/rentals/dto/list-rentals.dto.ts` with `page = 1` and `limit = 20`.
9. Update `MongoDbRentalService.findUserRentals` and `RentalsService.findAllForUser` to return `{ list, page, limit, total, size, hasMore }`.
10. Create `ListDisputesDto` in `src/modules/disputes/dto/list-disputes.dto.ts` with `page = 1` and `limit = 20`.
11. Update `MongoDbDisputeService.findByRentalId` and `DisputesService.getDisputesByRental` to support pagination and return `{ list, page, limit, total, size, hasMore }`.
12. Update controllers (`RentalsController.findAll` and `DisputesController.getDisputes`) to accept query DTOs and return paginated responses.
13. Update unit and e2e tests across auth, users, rentals, disputes, and reports. Run `npm run build`, `npm run lint`, and `npm run test`.

## Decisions made
- Register response format: Option B: `{ message: "User registered successfully", user: { id, firstName, lastName, role } }`.
- No `accessToken`, `email`, or `phone` in register response. Registration no longer auto-authenticates.
- User schema: `firstName` is required, `lastName` is optional (`trim: true, default: ''`).
- Pagination applied to all endpoints returning a collection: `GET /rentals` and `GET /rentals/:rentalId/disputes`.
- Pagination format matches `fanfare-backend`:
  - Query: `page: number = 1`, `limit: number = 20` (validated with `@Type(() => Number)`, `@IsNumber()`, `@Min(1)`, `@IsOptional()`).
  - Response: `{ list, page, limit, total, size, hasMore }`.

## API contracts / DTOs agreed
- `POST /auth/register`
  - Body: `RegisterDto` (`firstName`, `lastName`?, `email`, `phone`, `password`, `role`)
  - Returns: `{ message: "User registered successfully", user: { id: string, firstName: string, lastName: string, role: Role } }`
- `GET /rentals?page=1&limit=20`
  - Query: `ListRentalsDto` (`page?: number = 1`, `limit?: number = 20`)
  - Returns: `{ list: IRental[], page: number, limit: number, total: number, size: number, hasMore: boolean }`
- `GET /rentals/:rentalId/disputes?page=1&limit=20`
  - Query: `ListDisputesDto` (`page?: number = 1`, `limit?: number = 20`)
  - Returns: `{ list: IDispute[], page: number, limit: number, total: number, size: number, hasMore: boolean }`

## Schema / data model changes
- `User` schema:
  - Removed: `name: string`
  - Added: `firstName: string` (`required: true, trim: true`)
  - Added: `lastName: string` (`required: false, trim: true, default: ''`)

## Files touched
- `src/mongoDb/schema/user.schema.ts`
- `src/modules/users/dto/create-user.dto.ts`
- `src/modules/users/interfaces/user.interface.ts`
- `src/modules/auth/dto/register.dto.ts`
- `src/modules/auth/interfaces/auth.interface.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/auth.controller.ts`
- `src/mongoDb/mongo-db-rental.service.ts`
- `src/mongoDb/mongo-db-upload.service.ts`
- `src/mongoDb/mongo-db-dispute.service.ts`
- `src/modules/reports/pdf-report.builder.ts`
- `src/modules/rentals/dto/list-rentals.dto.ts`
- `src/modules/rentals/interfaces/rental.interface.ts`
- `src/modules/rentals/rentals.service.ts`
- `src/modules/rentals/rentals.controller.ts`
- `src/modules/disputes/dto/list-disputes.dto.ts`
- `src/modules/disputes/interfaces/dispute.interface.ts`
- `src/modules/disputes/disputes.service.ts`
- Unit and e2e test files

---

## Update: 2026-10-27 23:32 — Deepak

Implementation completed and fully verified:
- `User` schema updated with `firstName: string` (required) and `lastName?: string` (optional).
- `RegisterDto` and `CreateUserDto` validate `firstName` and optional `lastName`.
- `AuthService.register()` saves `firstName` and `lastName`, omits JWT generation, and returns `{ message: "User registered successfully", user: { id, firstName, lastName, role } }` without `accessToken`, `email`, or `phone`.
- Added `ListRentalsDto` and `ListDisputesDto` with `page = 1` and `limit = 20`.
- MongoDB DAL services `MongoDbRentalService.findUserRentals` and `MongoDbDisputeService.findByRentalIdPaginated` implement pagination returning `{ list, page, limit, total, size, hasMore }`.
- `RentalsController.findAll` and `DisputesController.getDisputes` accept pagination query DTOs and return paginated responses.
- `pdf-report.builder.ts` displays formatted full names from `firstName` and `lastName`.
- Restored `POST /inspections` in `InspectionsController` and added `GET /rentals/:rentalId/inspections` in `RentalInspectionsController`.
- All 11 unit test suites (85 tests) and all 7 e2e test suites (38 tests) pass cleanly.
- `npm run build` and `npm run lint` pass with zero errors.
