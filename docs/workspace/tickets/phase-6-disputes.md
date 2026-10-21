# Ticket: Phase 6 — Dispute Management & Deposit Reconciliation (`DisputesModule`)

**Date:** 2026-10-21  
**Status:** Completed  
**Author:** AI Pair Programmer & Deepak Rai  

---

## 1. Context & Motivation
Following move-out inspections and side-by-side comparison, landlords may claim deductions from the tenant's security deposit for damages, cleaning, or unpaid bills. To resolve deposit returns transparently:
1. Landlords propose itemized deductions linking to specific room checklist items and cryptographic evidence photos uploaded via `UploadModule`.
2. Tenants review proposals and either accept (automatically locking agreed deduction amounts and marking resolved) or dispute (submitting counter-offers and explanations).
3. The system calculates an aggregate deposit settlement statement showing initial deposit, total proposed deductions, total agreed deductions, and estimated refund amount.

---

## 2. Architecture & Implementation Summary

### Data Access Layer (`src/mongoDb/`)
- **Constants (`src/mongoDb/type/constant.ts`)**:
  - Added `DISPUTE_MODEL = 'DISPUTE_MODEL'`.
- **Schemas (`src/mongoDb/schema/dispute.schema.ts`)**:
  - `Dispute` collection with indexes on `{ rentalId: 1, createdAt: -1 }` and `{ rentalId: 1, resolved: 1 }`.
  - Fields: `rentalId` (ref `Rental`), `roomItemId` (ref `RoomItem`, optional), `category` (`DisputeCategory`), `proposedDeduction` (number, min: 0), `description` (string), `evidencePhotos` (`ObjectId[]` ref `Upload`), `tenantStatus` (`DisputeTenantStatus`, default `pending`), `tenantComment` (string), `counterAmount` (number), `resolved` (boolean, default `false`), `agreedDeduction` (number), `resolvedAt` (Date).
- **Service (`src/mongoDb/mongo-db-dispute.service.ts`)**:
  - `create`, `findById`, `findByRentalId`, `update`, `delete`.
  - `POPULATE_TAB` placed strictly at the bottom of the file (populating `evidencePhotos` and `roomItemId`).
- **Factory Provider (`src/mongoDb/mongo-db.module.ts`)**:
  - Provided `DISPUTE_MODEL` via connection factory provider and exported with `MongoDbDisputeService`.

### Feature Domain Layer (`src/modules/disputes/`)
- **Interfaces (`src/modules/disputes/interfaces/dispute.interface.ts`)**:
  - `IDispute`, `ICreateDisputeInput`, `IRespondDisputeInput`, `IDisputeSettlementSummary`, `IDisputeSettlementResponse`.
- **DTOs (`src/modules/disputes/dto/`)**:
  - `CreateDisputeDto`: Validates `category`, `proposedDeduction`, `description`, optional `roomItemId`, and optional `evidencePhotos: string[]`.
  - `RespondDisputeDto`: Validates `tenantStatus` (`accepted` | `disputed`), optional `tenantComment`, and optional `counterAmount`.
- **Service (`src/modules/disputes/disputes.service.ts`)**:
  - `createDispute`: Ensures only landlord can propose deductions; validates rental, room items, and upload photo IDs exist.
  - `getDisputesByRental`: Verifies rental access (landlord or tenant) and retrieves populated disputes.
  - `getDisputeById`: Validates rental authorization and retrieves specific dispute.
  - `respondToDispute`: Ensures only tenant can respond; rejects already resolved disputes with `409 Conflict`; when tenant accepts, automatically sets `agreedDeduction = proposedDeduction`, `resolved = true`, and `resolvedAt = new Date()`.
  - `getSettlementSummary`: Calculates aggregate reconciliation breakdown (`depositAmount`, `totalProposedDeductions`, `totalAgreedDeductions`, `estimatedRefundAmount`, `pendingDisputesCount`, `resolvedDisputesCount`, `totalDisputesCount`).
- **Controller (`src/modules/disputes/disputes.controller.ts`)**:
  - `POST /api/v1/rentals/:rentalId/disputes`: Propose itemized deduction.
  - `GET /api/v1/rentals/:rentalId/disputes`: List disputes for rental.
  - `GET /api/v1/rentals/:rentalId/disputes/settlement`: Calculate deposit settlement summary.
  - `GET /api/v1/rentals/:rentalId/disputes/:disputeId`: Fetch specific dispute details.
  - `PATCH /api/v1/rentals/:rentalId/disputes/:disputeId`: Tenant response.
  - Protected per method using `@UseGuards(JwtAuthGuard)` and `@CurrentUser() user: JwtPayload`.
- **Module & App Wiring**:
  - Registered `DisputesModule` in `AppModule.imports`.

---

## 3. Verification & Test Results
- `npm run format`: Prettier cleanly formatted all source and test files.
- `npm run build`: Compiled with 0 errors.
- `npm test`: **62/62** unit tests passing across all 8 test suites:
  - `DisputesService` spec: Verified landlord proposal authorization, room item / photo validation, tenant response handling (accept vs dispute), already resolved rejection, and deposit reconciliation calculation.
- `npm run test:e2e`: **34/34** E2E tests passing across all 6 test suites:
  - `test/disputes.e2e-spec.ts`:
    - Verified tenant/outsider cannot propose deductions (403 Forbidden).
    - Verified landlord proposing damage deduction with uploaded evidence photo.
    - Verified landlord proposing cleaning deduction.
    - Verified initial settlement calculation before tenant responses.
    - Verified landlord cannot respond to disputes (403 Forbidden).
    - Verified tenant accepting damage deduction -> locks agreed deduction and marks resolved.
    - Verified tenant disputing cleaning deduction with counter offer.
    - Verified immutable resolved dispute cannot be modified (409 Conflict).
    - Verified updated settlement reconciliation reflecting exact refunded and agreed amounts.
    - Verified outsider access control (403 Forbidden).

---

## 4. Files Created / Modified
- `src/mongoDb/type/constant.ts`
- `src/mongoDb/schema/dispute.schema.ts`
- `src/mongoDb/mongo-db-dispute.service.ts`
- `src/mongoDb/mongo-db.module.ts`
- `src/modules/disputes/interfaces/dispute.interface.ts`
- `src/modules/disputes/dto/create-dispute.dto.ts`
- `src/modules/disputes/dto/respond-dispute.dto.ts`
- `src/modules/disputes/disputes.service.ts`
- `src/modules/disputes/disputes.controller.ts`
- `src/modules/disputes/disputes.module.ts`
- `src/modules/disputes/disputes.service.spec.ts`
- `src/app.module.ts`
- `test/disputes.e2e-spec.ts`
- `docs/workspace/tickets/phase-6-disputes.md`
