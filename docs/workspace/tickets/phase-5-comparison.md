# Ticket: Phase 5 — Move-Out Inspection & Comparison Engine (`ComparisonModule`)

**Date:** 2026-10-21  
**Status:** Completed  
**Author:** AI Pair Programmer & Deepak Rai  

---

## 1. Context & Motivation
At the end of tenancy, parties conduct a move-out inspection. To ensure objective, tamper-proof dispute resolution:
1. Move-out inspection can only be initialized once the move-in inspection is verified and `locked`.
2. Move-in checklist items are auto-cloned into the move-out inspection as checklist templates.
3. An automated side-by-side comparison engine matches move-in and move-out items by room and item name, classifies condition transitions (`unchanged`, `minor_wear`, `damaged_since_move_in`, `missing_at_move_out`, `added_during_tenancy`), and computes aggregate summary metrics for dispute adjudication and deposit refund calculation.

---

## 2. Architecture & Implementation Summary

### Centralized Enums (`src/common/enums/index.ts`)
- Added `ComparisonDiffStatus`:
  - `UNCHANGED = 'unchanged'`
  - `MINOR_WEAR = 'minor_wear'`
  - `DAMAGED_SINCE_MOVE_IN = 'damaged_since_move_in'`
  - `MISSING_AT_MOVE_OUT = 'missing_at_move_out'`
  - `ADDED_DURING_TENANCY = 'added_during_tenancy'`

### Inspections Module Enhancement (`src/modules/inspections/`)
- Updated `InspectionsService.createInspection`:
  - If `type === InspectionType.MOVE_OUT`, queries existing `move_in` inspection for the rental.
  - Requires `move_in` inspection to exist and have `status === InspectionStatus.LOCKED`; throws `BadRequestException` otherwise.
  - Auto-clones room items from the locked `move_in` inspection into the new `move_out` inspection.

### Comparison Module (`src/modules/comparison/`)
- **Interfaces (`src/modules/comparison/interfaces/comparison.interface.ts`)**:
  - `IInspectionItemSnapshot`: Item `_id`, `condition`, `notes`, `photos` (populated with upload metadata & sha256).
  - `IItemComparison`: `roomName`, `itemName`, `diffStatus`, `moveIn` snapshot, `moveOut` snapshot.
  - `IComparisonSummary`: `totalItems`, `unchangedCount`, `minorWearCount`, `damagedCount`, `missingCount`, `addedCount`.
  - `IRentalComparisonResponse`: `rentalId`, `moveInInspectionId`, `moveInLocked`, `moveOutInspectionId`, `moveOutLocked`, `summary`, `comparisons`.
- **Service (`src/modules/comparison/comparison.service.ts`)**:
  - `getComparison(rentalId, user)`:
    - Validates rental exists and user has authorization (landlord, tenant, or invited tenant).
    - Fetches move-in and move-out inspections along with their populated room items via `MongoDbRoomItemService`.
    - Key-pairs items by `${roomName}:::${itemName}` (case-insensitive, trimmed).
    - Classifies transitions:
      - Same condition -> `unchanged`.
      - Move-out is `damaged` or `not_working` -> `damaged_since_move_in`.
      - Good to minor scratch / wear -> `minor_wear`.
      - In move-in but absent in move-out -> `missing_at_move_out`.
      - Absent in move-in but present in move-out -> `added_during_tenancy`.
    - Sorts comparisons alphabetically by `roomName`, then `itemName`.
    - Computes summary counts across all status categories.
- **Controller (`src/modules/comparison/comparison.controller.ts`)**:
  - `GET /api/v1/rentals/:rentalId/comparison`: Protected with `JwtAuthGuard` at route handler method level; injects `@CurrentUser() user: JwtPayload`.
- **Module (`src/modules/comparison/comparison.module.ts`) & Wiring (`src/app.module.ts`)**:
  - Registered `ComparisonModule` in `AppModule.imports`.

---

## 3. Verification & Test Results
- `npm run format`: Prettier cleanly formatted all source and test files.
- `npm run build`: 0 compilation errors.
- `npm test`: **51/51** unit tests passing across all 7 test suites:
  - `InspectionsService` spec: Added tests for move-out prerequisite validation (400 if move-in missing/unlocked) and auto-cloning of checklist items.
  - `ComparisonService` spec: Comprehensive tests for diff classification, summary count calculation, sorting, and access control.
- `npm run test:e2e`: **23/23** E2E tests passing across all 5 test suites:
  - `test/comparison.e2e-spec.ts`:
    - Full end-to-end lifecycle from rental setup to move-in creation -> item addition with photo upload -> dual sign-off & lock -> move-out creation with auto-cloning verification -> move-out item update to damaged -> tenancy addition -> dual sign-off & lock -> side-by-side comparison response verification -> 403 Forbidden check for unauthorized users.

---

## 4. Files Created / Modified
- `src/common/enums/index.ts`
- `src/modules/inspections/inspections.service.ts`
- `src/modules/inspections/inspections.service.spec.ts`
- `src/modules/comparison/interfaces/comparison.interface.ts`
- `src/modules/comparison/comparison.service.ts`
- `src/modules/comparison/comparison.controller.ts`
- `src/modules/comparison/comparison.module.ts`
- `src/modules/comparison/comparison.service.spec.ts`
- `src/app.module.ts`
- `test/comparison.e2e-spec.ts`
- `docs/workspace/tickets/phase-5-comparison.md`
