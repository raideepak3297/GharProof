/**
 * Centralized Application Enums
 * All system and domain enums must be defined in this file.
 */

export enum Role {
  LANDLORD = 'landlord',
  TENANT = 'tenant',
}

export enum RentalStatus {
  DRAFT = 'draft',
  INVITED = 'invited',
  ACTIVE = 'active',
  NOTICE_PERIOD = 'notice_period',
  COMPLETED = 'completed',
}

export enum InspectionType {
  MOVE_IN = 'move_in',
  MOVE_OUT = 'move_out',
}

export enum InspectionStatus {
  DRAFT = 'draft',
  PENDING_SIGNATURES = 'pending_signatures',
  LOCKED = 'locked',
}

export enum ItemCondition {
  GOOD = 'good',
  MINOR_SCRATCH = 'minor_scratch',
  DAMAGED = 'damaged',
  NOT_WORKING = 'not_working',
}

export enum DisputeCategory {
  DAMAGE = 'damage',
  CLEANING = 'cleaning',
  UNPAID_BILL = 'unpaid_bill',
  OTHER = 'other',
}

export enum DisputeTenantStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DISPUTED = 'disputed',
}
