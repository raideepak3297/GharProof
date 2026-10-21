# Ticket: Dedicated Upload Module (`UploadModule`) & Metadata Storage

**Date:** 2026-10-21  
**Status:** Completed  
**Author:** AI Pair Programmer & Deepak Rai  

---

## 1. Context & Motivation
Decouple media ingestion and file storage from domain feature entities (inspections, room items, disputes). 
- Frontend calls a standalone `POST /api/v1/uploads` endpoint with `multipart/form-data`.
- Backend securely stores file on disk, calculates its cryptographic `SHA-256` digest on ingestion (tamper-proofing requirement), and persists file metadata in the `uploads` collection.
- API returns the upload record containing `_id`, `path`, and `sha256Hash`.
- Subsequent domain endpoints (e.g., `POST /inspections/:id/items`) accept the `upload._id` array to link images cleanly without duplicating binary data or file transfer logic.

---

## 2. Architecture & Implementation Summary

### Data Access Layer (`src/mongoDb/`)
- **Constants (`src/mongoDb/type/constant.ts`)**:
  - Added `UPLOAD_MODEL = 'UPLOAD_MODEL'`.
- **Mongoose Schema (`src/mongoDb/schema/upload.schema.ts`)**:
  - Collection: `uploads`.
  - Properties: `originalName`, `fileName`, `mimeType`, `size`, `path`, `sha256Hash`, `uploadedBy` (ref: `User`).
  - Index: `{ uploadedBy: 1, createdAt: -1 }`, `{ sha256Hash: 1 }`.
  - Transforms: `toJSON` and `toObject` stripping `__v`.
- **DAL Query Service (`src/mongoDb/mongo-db-upload.service.ts`)**:
  - Injects `@Inject(UPLOAD_MODEL)`.
  - Implements `create`, `findById`, `findByIds`, `findByHash`, `findUserUploads`.
  - Defined `POPULATE_TAB` at the bottom of the file after the class.
- **Module Providers (`src/mongoDb/mongo-db.module.ts`)**:
  - Registered `UPLOAD_MODEL` factory provider via `MONGODB_CONNECTION` and `Connection.model(...)`.
  - Exported `MongoDbUploadService` and `UPLOAD_MODEL`.

### Feature Layer (`src/modules/upload/`)
- **Interfaces (`src/modules/upload/interfaces/upload.interface.ts`)**:
  - Defined `IUpload`, `ICreateUploadInput`, `IUploadResponse`.
- **Service (`src/modules/upload/upload.service.ts`)**:
  - Validates MIME types (JPEG, PNG, WEBP, HEIC, PDF) and max size (15MB).
  - Calculates SHA-256 hash using `crypto.createHash('sha256')`.
  - Persists file to disk in `./uploads/{YYYY-MM}/{timestamp}-{hex}{ext}`.
  - Persists record via `MongoDbUploadService`.
  - Implements `processSingleUpload`, `processMultipleUploads`, `getUploadById`, `getFilePath`.
- **Controller (`src/modules/upload/upload.controller.ts`)**:
  - `POST /api/v1/uploads` — Single file upload with route-level `@UseGuards(JwtAuthGuard)` and `@CurrentUser() user: JwtPayload`.
  - `POST /api/v1/uploads/batch` — Batch file upload (up to 10 files).
  - `GET /api/v1/uploads/:id` — Metadata retrieval.
  - `GET /api/v1/uploads/:id/view` — File streaming with correct MIME type.
- **Root Wiring (`src/app.module.ts`)**:
  - Registered `UploadModule` in `AppModule`.

---

## 3. Verification & Test Results
- `npm run format`: Clean.
- `npm run build`: 0 errors.
- `npm test`: 33/33 unit tests passing across all 5 test suites (`UploadService`, `RentalsService`, `AuthService`, `UsersService`, `AppController`).
- `npm run test:e2e`: 8/8 E2E tests passing across all 3 suites (`UploadController`, `RentalsController`, `AppController`).
  - Verified 401 Unauthorized for unauthenticated requests.
  - Verified single file upload generates `_id` and 64-character SHA-256 hash.
  - Verified metadata retrieval by `_id`.

---

## 4. Files Created / Modified
- `src/mongoDb/type/constant.ts`
- `src/mongoDb/schema/upload.schema.ts`
- `src/mongoDb/mongo-db-upload.service.ts`
- `src/mongoDb/mongo-db.module.ts`
- `src/modules/upload/interfaces/upload.interface.ts`
- `src/modules/upload/upload.service.ts`
- `src/modules/upload/upload.controller.ts`
- `src/modules/upload/upload.module.ts`
- `src/modules/upload/upload.service.spec.ts`
- `src/app.module.ts`
- `test/upload.e2e-spec.ts`
- `docs/workspace/tickets/upload-module.md`
