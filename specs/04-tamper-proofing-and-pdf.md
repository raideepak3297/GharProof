# GharProof Tamper-Proofing and PDF Generation Specification

## 1. Tamper-Proofing Protocol

GharProof solves the "he-said-she-said" problem by ensuring that condition photos and inspection documents can never be altered post-agreement.

### Cryptographic Hashing Standard:
- **Algorithm**: `SHA-256` (Secure Hash Algorithm 256-bit).
- **Format**: Lowercase hexadecimal string (64 characters).

### Step-by-Step Flow:
1. **Photo Ingestion**:
   - As an image file is uploaded via `multipart/form-data`, Multer streams bytes into `crypto.createHash('sha256')`.
   - The computed hash is stored in the database alongside the photo storage path.
   - If a file is altered on disk or replaced, its SHA-256 will no longer match the database record.

2. **Inspection Locking & Root Hash**:
   - Both parties review the inspection.
   - When both Landlord and Tenant mark `agree = true`:
     1. Retrieve all items for the inspection sorted alphabetically by `_id`.
     2. Form a canonical payload object:
        ```typescript
        const canonicalPayload = {
          inspectionId: inspection._id.toString(),
          rentalId: inspection.rentalId.toString(),
          type: inspection.type,
          landlordSignedAt: inspection.landlordSignedAt.toISOString(),
          tenantSignedAt: inspection.tenantSignedAt.toISOString(),
          items: items.map(item => ({
            id: item._id.toString(),
            roomName: item.roomName,
            itemName: item.itemName,
            condition: item.condition,
            notes: item.notes || '',
            photos: item.photos.map(p => ({
              url: p.photoUrl,
              sha256: p.sha256Hash
            }))
          }))
        };
        ```
     3. Compute the `rootHash`:
        ```typescript
        const rootHash = crypto.createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');
        ```
     4. Save `rootHash` to the `Inspection` document and set `status = 'locked'`.

3. **Immutability Enforcement**:
   - Update, delete, or upload endpoints for `inspections` and `room_items` MUST verify `inspection.status !== 'locked'`.
   - Any attempt to modify a locked inspection will immediately abort with `403 Forbidden: Inspection is locked and immutable.`

---

## 2. Verifiable PDF Report Generation

The PDF report serves as the conclusive legal evidence document for both parties.

### Tools:
- `pdfkit` (preferred for low memory overhead and streaming) or Puppeteer for HTML-to-PDF rendering.

### Document Structure:
1. **Header & Cover Summary**:
   - Document Title: `GharProof Verified Rental Condition Report`.
   - Rental ID, property address, landlord name & tenant name.
   - Initial deposit amount, monthly rent, move-in and move-out dates.
2. **Verification & Audit Certificate**:
   - Move-in `Root Hash`: `[64-char hex]` (Signed by both on `YYYY-MM-DD`).
   - Move-out `Root Hash`: `[64-char hex]` (Signed by both on `YYYY-MM-DD`).
   - QR code or verification link containing the hash for external verification.
3. **Condition Comparison Table**:
   - Itemized by Room (Kitchen, Living Room, Bedrooms, Bathrooms).
   - Columns: Item, Move-in Condition, Move-out Condition, Delta / Status.
4. **Photo Exhibit Matrix**:
   - High-resolution thumbnails of move-in vs move-out photos side by side.
   - Attached timestamp and individual photo SHA-256 fingerprint displayed below each image.
5. **Deposit Reconciliation Statement**:
   - Starting deposit: ₹XX,XXX.
   - Agreed deductions (itemized).
   - Final refund due to tenant: ₹XX,XXX.
   - Signatures block.
