# GharProof REST API Endpoints Specification

Base URL: `/api/v1`

All protected endpoints require HTTP Header:
`Authorization: Bearer <jwt-token>`

---

## 1. Authentication Module (`/auth`)

### `POST /auth/register`
- **Description**: Register a new user (landlord or tenant).
- **Body**:
  ```json
  {
    "name": "Deepak Rai",
    "email": "deepak@example.com",
    "phone": "+919876543210",
    "password": "SecurePassword123!",
    "role": "landlord"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "User registered successfully",
    "user": { "id": "...", "name": "...", "email": "...", "role": "landlord" },
    "accessToken": "eyJhbGciOi..."
  }
  ```

### `POST /auth/login`
- **Description**: Authenticate with email and password.
- **Body**: `{ "email": "...", "password": "..." }`
- **Response `200 OK`**: `{ "accessToken": "...", "user": { ... } }`

### `GET /auth/me`
- **Description**: Return profile of currently authenticated user.
- **Response `200 OK`**: `{ "id": "...", "name": "...", "email": "...", "role": "..." }`

---

## 2. Rentals Module (`/rentals`)

### `POST /rentals`
- **Role**: `landlord`
- **Description**: Create a new rental property record.
- **Body**:
  ```json
  {
    "propertyAddress": {
      "line1": "Flat 402, Green Heights",
      "city": "Bengaluru",
      "state": "Karnataka",
      "postalCode": "560100"
    },
    "monthlyRent": 25000,
    "depositAmount": 75000,
    "startDate": "2026-11-01T00:00:00.000Z",
    "tenantInviteEmail": "tenant@example.com",
    "tenantInvitePhone": "+919123456789"
  }
  ```
- **Response `201 Created`**: Returns created Rental document.

### `GET /rentals`
- **Description**: List all rentals where user is landlord or tenant.
- **Response `200 OK`**: `[ { ...Rental } ]`

### `GET /rentals/:id`
- **Description**: Retrieve rental details with inspection statuses.
- **Response `200 OK`**: `{ ...Rental, moveInInspection: { ... }, moveOutInspection: { ... } }`

### `POST /rentals/:id/accept-invite`
- **Role**: `tenant`
- **Description**: Tenant links their user account to the rental using invite token or email match.
- **Response `200 OK`**: `{ "message": "Rental invitation accepted", "rentalId": "..." }`

---

## 3. Inspections Module (`/inspections`)

### `POST /rentals/:rentalId/inspections`
- **Description**: Initialize `move_in` or `move_out` inspection.
- **Body**: `{ "type": "move_in" | "move_out" }`
- **Response `201 Created`**: Returns Inspection document in `draft` status.

### `GET /inspections/:id`
- **Description**: Get inspection details and all associated room items.
- **Response `200 OK`**: `{ ...Inspection, items: [ ...RoomItem ] }`

### `POST /inspections/:id/items`
- **Description**: Add room checklist item with notes and condition.
- **Guard**: Must be in `draft` status.
- **Body**:
  ```json
  {
    "roomName": "Living Room",
    "itemName": "Ceiling Fan",
    "condition": "good",
    "notes": "Remote control included and working"
  }
  ```
- **Response `201 Created`**: Returns created `RoomItem`.

### `POST /inspections/:id/items/:itemId/photos`
- **Description**: Upload photos for a checklist item (`multipart/form-data`).
- **Guard**: Must be in `draft` status.
- **Files**: Field `photos` (multiple files).
- **Processing**: Compute SHA-256 hash for each photo; save path and hash to `photos` array.
- **Response `201 Created`**:
  ```json
  {
    "photos": [
      {
        "photoUrl": "/uploads/inspections/...jpg",
        "sha256Hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "uploadedAt": "2026-10-19T10:00:00.000Z"
      }
    ]
  }
  ```

### `POST /inspections/:id/sign-off`
- **Description**: Landlord or Tenant signs off ("Agrees") on the inspection.
- **Body**: `{ "agree": true }`
- **Processing**:
  - Updates `landlordSigned` or `tenantSigned`.
  - If **both** have signed:
    1. Computes canonical `rootHash` over all items, photos, and signatures.
    2. Sets `status = 'locked'` and `lockedAt = new Date()`.
- **Response `200 OK`**:
  ```json
  {
    "status": "locked",
    "landlordSigned": true,
    "tenantSigned": true,
    "rootHash": "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    "lockedAt": "2026-10-19T10:15:00.000Z"
  }
  ```

---

## 4. Comparison Engine (`/rentals/:id/comparison`)

### `GET /rentals/:id/comparison`
- **Description**: Compare move-in inspection items against move-out inspection items.
- **Response `200 OK`**:
  ```json
  {
    "rentalId": "...",
    "moveInLocked": true,
    "moveOutLocked": true,
    "summary": { "unchanged": 12, "damaged": 2, "disputed": 1 },
    "comparisons": [
      {
        "roomName": "Kitchen",
        "itemName": "Sink Tap",
        "moveIn": { "condition": "good", "photoUrls": ["..."], "notes": "No leaks" },
        "moveOut": { "condition": "damaged", "photoUrls": ["..."], "notes": "Handle broken" },
        "diffStatus": "damaged_since_move_in"
      }
    ]
  }
  ```

---

## 5. Disputes & Deductions (`/rentals/:id/disputes`)

### `POST /rentals/:id/disputes`
- **Role**: `landlord`
- **Description**: Propose a deposit deduction for damages.
- **Body**:
  ```json
  {
    "roomItemId": "...",
    "category": "damage",
    "proposedDeduction": 3500,
    "description": "Broken bathroom tap replacement cost",
    "evidencePhotoUrls": ["..."]
  }
  ```
- **Response `201 Created`**: Returns Dispute record.

### `PATCH /rentals/:id/disputes/:disputeId`
- **Role**: `tenant`
- **Description**: Accept or dispute deduction.
- **Body**:
  ```json
  {
    "tenantStatus": "disputed",
    "tenantComment": "Wear and tear, tap was already loose",
    "counterAmount": 1000
  }
  ```
- **Response `200 OK`**: Updated Dispute record.

---

## 6. PDF Report Generation (`/rentals/:id/report.pdf`)

### `GET /rentals/:id/report.pdf`
- **Description**: Generates and streams a downloadable tamper-proof PDF audit report.
- **Headers**:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="GharProof-Inspection-Report-<rentalId>.pdf"`
- **Contents**: Rental details, move-in summary, move-out comparison, photo exhibits, SHA-256 verification hashes, and final deposit reconciliation.
