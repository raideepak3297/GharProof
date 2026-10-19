# GharProof Data Models & MongoDB Schemas Specification

This document details the MongoDB collections, fields, types, and indexes used by Mongoose.

---

## 1. User (`users`)
Represents landlords and tenants.

```typescript
{
  _id: ObjectId;
  name: string;
  email: string;             // unique, lowercase, indexed
  phone: string;             // indexed
  passwordHash: string;      // bcrypt hash
  role: 'landlord' | 'tenant' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 2. Rental (`rentals`)
Represents the property agreement between a landlord and tenant.

```typescript
{
  _id: ObjectId;
  landlordId: ObjectId;      // ref: User, indexed
  tenantId?: ObjectId;       // ref: User, optional until accepted, indexed
  tenantInviteEmail?: string;
  tenantInvitePhone?: string;
  propertyAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  monthlyRent: number;
  depositAmount: number;
  status: 'draft' | 'invited' | 'active' | 'notice_period' | 'completed';
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Inspection (`inspections`)
Represents either a move-in or move-out inspection snapshot.

```typescript
{
  _id: ObjectId;
  rentalId: ObjectId;        // ref: Rental, indexed
  type: 'move_in' | 'move_out';
  status: 'draft' | 'pending_signatures' | 'locked';
  
  // Sign-off status
  landlordSigned: boolean;
  landlordSignedAt?: Date;
  tenantSigned: boolean;
  tenantSignedAt?: Date;

  // Tamper-proofing
  rootHash?: string;         // SHA-256 fingerprint generated upon locking
  lockedAt?: Date;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```
*Index*: Compound index on `{ rentalId: 1, type: 1 }` (unique constraint per rental/type pair).

---

## 4. RoomItem (`room_items`)
Individual inspection checklist items per room (e.g. Living room wall, Kitchen sink, Bedroom fan).

```typescript
{
  _id: ObjectId;
  inspectionId: ObjectId;    // ref: Inspection, indexed
  roomName: string;          // e.g., 'Master Bedroom', 'Kitchen', 'Bathroom'
  itemName: string;          // e.g., 'East Wall', 'Ceiling Fan', 'Window'
  condition: 'good' | 'minor_scratch' | 'damaged' | 'not_working';
  notes?: string;

  // Media & Tamper-Proofing
  photos: Array<{
    photoUrl: string;
    sha256Hash: string;     // SHA-256 of the raw photo file
    uploadedAt: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}
```
*Index*: `{ inspectionId: 1, roomName: 1 }`.

---

## 5. Dispute & Deduction (`disputes`)
Tracks move-out deposit deduction proposals and dispute status.

```typescript
{
  _id: ObjectId;
  rentalId: ObjectId;        // ref: Rental, indexed
  roomItemId?: ObjectId;     // ref: RoomItem, optional if general fee
  category: 'damage' | 'cleaning' | 'unpaid_bill' | 'other';
  proposedDeduction: number;
  description: string;
  evidencePhotoUrls: string[];

  // Tenant response
  tenantStatus: 'pending' | 'accepted' | 'disputed';
  tenantComment?: string;
  counterAmount?: number;

  resolved: boolean;
  agreedDeduction?: number;
  resolvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6. AuditLog (`audit_logs`)
Maintains an immutable sequence of significant lifecycle actions.

```typescript
{
  _id: ObjectId;
  rentalId: ObjectId;
  inspectionId?: ObjectId;
  actorId: ObjectId;         // ref: User
  action: 'rental_created' | 'tenant_invited' | 'item_added' | 'inspection_signed' | 'inspection_locked' | 'dispute_raised';
  metadata: Record<string, any>;
  timestamp: Date;
}
```
