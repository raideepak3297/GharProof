# Ticket: Phase 4 — Inspections & Tamper-Proof Storage (`InspectionsModule`)

**Date:** 2026-10-21  
**Status:** Completed  
**Author:** AI Pair Programmer & Deepak Rai  

---

## 1. Context & Motivation
Implement the complete inspection lifecycle where condition photos uploaded via `UploadModule` are referenced by `_id`, room checklist items are documented, dual sign-off is performed, and tamper-proof SHA-256 composite root hashing and immutability are enforced.

---

## 2. Architecture & Implementation Summary

### Data Access Layer (`src/mongoDb/`)
- **Constants (`src/mongoDb/type/constant.ts`)**:
  - Added `INSPECTION_MODEL = 'INSPECTION_MODEL'` and `ROOM_ITEM_MODEL = 'ROOM_ITEM_MODEL'`.
- **Schemas (`src/mongoDb/schema/`)**:
  - `inspection.schema.ts`: `inspections` collection with `{ rentalId: 1, type: 1 }` unique compound index. Tracks `type` (`move_in`/`move_out`), `status` (`draft`/`pending_signatures`/`locked`), dual signatures (`landlordSigned`, `tenantSigned`), timestamps, and `rootHash`.
  - `room-item.schema.ts`: `room_items` collection with `{ inspectionId: 1, roomName: 1 }` index. Links photos via `photos: [{ type: ObjectId, ref: 'Upload' }]`.
- **DAL Services (`src/mongoDb/`)**:
  - `mongo-db-inspection.service.ts`: `create`, `findById`, `findByRentalAndType`, `findByRental`, `update`.
  - `mongo-db-room-item.service.ts`: `create`, `findByInspectionId` (populated with `Upload`), `findById`, `update`, `delete`.
  - `POPULATE_TAB` defined strictly at the bottom of the files after classes.
- **Factory Providers (`src/mongoDb/mongo-db.module.ts`)**:
  - Provided `INSPECTION_MODEL` and `ROOM_ITEM_MODEL` via connection factory providers and exported.

### Feature Layer (`src/modules/inspections/`)
- **Interfaces (`src/modules/inspections/interfaces/inspection.interface.ts`)**:
  - Defined `IInspection`, `IRoomItem`, `ICreateInspectionInput`, `ICreateRoomItemInput`, `IUpdateRoomItemInput`, `IInspectionDetail`.
- **DTOs (`src/modules/inspections/dto/`)**:
  - `CreateInspectionDto`: Validates `type` enum and optional `notes`/`rentalId`.
  - `CreateRoomItemDto`: Validates `roomName`, `itemName`, `condition`, and `photos: string[]` (valid upload `_id`s).
  - `UpdateRoomItemDto`: Optional updates for condition, notes, photos.
  - `SignOffInspectionDto`: Validates `agree: boolean`.
- **Service (`src/modules/inspections/inspections.service.ts`)**:
  - Enforces rental authorization (`landlord`, `tenant`, or `tenantInviteEmail`).
  - Enforces immutability: Rejects modifications to locked inspections with `403 Forbidden`.
  - Validates that provided `photos` exist in `Upload` collection.
  - Dual sign-off:
    - First signer transitions status to `pending_signatures`.
    - Both signers transitions status to `locked`, computes composite canonical SHA-256 `rootHash` over sorted items, conditions, and photo hashes, and locks with `lockedAt` timestamp.
- **Controllers**:
  - `InspectionsController` (`src/modules/inspections/inspections.controller.ts`):
    - `POST /api/v1/inspections`
    - `POST /api/v1/inspections/rental/:rentalId`
    - `GET /api/v1/inspections/:id`
    - `POST /api/v1/inspections/:id/items`
    - `PATCH /api/v1/inspections/:id/items/:itemId`
    - `POST /api/v1/inspections/:id/sign-off`
  - `RentalInspectionsController` (`src/modules/inspections/rental-inspections.controller.ts`):
    - `POST /api/v1/rentals/:rentalId/inspections`
- **Module & App Wiring**:
  - `InspectionsModule` wired into `AppModule`.

---

## 3. Verification & Test Results
- `npm run format`: Clean.
- `npm run build`: 0 compilation errors.
- `npm test`: **43/43** unit tests passing across all 6 test suites (`InspectionsService`, `UploadService`, `RentalsService`, `AuthService`, `UsersService`, `AppController`).
- `npm run test:e2e`: **14/14** E2E tests passing across all 4 suites:
  - Verified 401 Unauthorized for unauthenticated requests.
  - Verified `POST /rentals/:rentalId/inspections` creates `move_in` inspection in `draft` status.
  - Verified `POST /inspections/:id/items` successfully receives and links `upload._id`.
  - Verified `GET /inspections/:id` populates `photos` with file metadata and 64-character SHA-256 hash.
  - Verified dual sign-off calculates composite `rootHash` and transitions status to `locked`.
  - Verified immutability: adding/updating items on a locked inspection is rejected with `403 Forbidden`.

---

## 4. Files Created / Modified
- `src/mongoDb/type/constant.ts`
- `src/mongoDb/schema/inspection.schema.ts`
- `src/mongoDb/schema/room-item.schema.ts`
- `src/mongoDb/mongo-db-inspection.service.ts`
- `src/mongoDb/mongo-db-room-item.service.ts`
- `src/mongoDb/mongo-db.module.ts`
- `src/modules/inspections/interfaces/inspection.interface.ts`
- `src/modules/inspections/dto/create-inspection.dto.ts`
- `src/modules/inspections/dto/create-room-item.dto.ts`
- `src/modules/inspections/dto/update-room-item.dto.ts`
- `src/modules/inspections/dto/sign-off-inspection.dto.ts`
- `src/modules/inspections/inspections.service.ts`
- `src/modules/inspections/inspections.controller.ts`
- `src/modules/inspections/rental-inspections.controller.ts`
- `src/modules/inspections/inspections.module.ts`
- `src/modules/inspections/inspections.service.spec.ts`
- `src/app.module.ts`
- `test/inspections.e2e-spec.ts`
- `docs/workspace/tickets/phase-4-inspections.md`
