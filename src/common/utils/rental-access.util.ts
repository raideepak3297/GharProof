import { ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../../modules/auth/interfaces/auth.interface';

/**
 * Extracts a normalized string ID from an ObjectId, string, or populated Mongoose document.
 */
export function extractEntityId(idOrEntity: any): string | undefined {
  if (!idOrEntity) return undefined;
  return (idOrEntity._id || idOrEntity).toString();
}

/**
 * Checks whether the authenticated user is either the landlord, assigned tenant,
 * or invited tenant for the specified rental.
 */
export function isUserPartyToRental(rental: any, user: JwtPayload): boolean {
  if (!rental || !user) return false;

  const landlordIdStr = extractEntityId(rental.landlordId);
  const tenantIdStr = extractEntityId(rental.tenantId);
  const tenantInviteEmail = rental.tenantInviteEmail?.toLowerCase();
  const userEmail = user.email.toLowerCase();

  return (
    landlordIdStr === user.userId ||
    tenantIdStr === user.userId ||
    (!!tenantInviteEmail && tenantInviteEmail === userEmail)
  );
}

/**
 * Checks whether the authenticated user is the landlord of the rental.
 */
export function isUserLandlord(rental: any, user: JwtPayload): boolean {
  if (!rental || !user) return false;
  return extractEntityId(rental.landlordId) === user.userId;
}

/**
 * Checks whether the authenticated user is the assigned or invited tenant of the rental.
 */
export function isUserTenant(rental: any, user: JwtPayload): boolean {
  if (!rental || !user) return false;
  const tenantIdStr = extractEntityId(rental.tenantId);
  const tenantInviteEmail = rental.tenantInviteEmail?.toLowerCase();
  const userEmail = user.email.toLowerCase();

  return tenantIdStr === user.userId || (!!tenantInviteEmail && tenantInviteEmail === userEmail);
}

/**
 * Enforces that the authenticated user has access to the rental, throwing
 * ForbiddenException if unauthorized.
 */
export function assertRentalAccess(
  rental: any,
  user: JwtPayload,
  resourceName = 'this rental',
): void {
  if (!isUserPartyToRental(rental, user)) {
    throw new ForbiddenException(`You do not have access to ${resourceName}`);
  }
}

/**
 * Enforces that only the landlord of the rental can perform the operation.
 */
export function assertLandlordAccess(
  rental: any,
  user: JwtPayload,
  action = 'propose deductions for this rental',
): void {
  if (!isUserLandlord(rental, user)) {
    throw new ForbiddenException(`Only the landlord can ${action}`);
  }
}

/**
 * Enforces that only the tenant of the rental can perform the operation.
 */
export function assertTenantAccess(
  rental: any,
  user: JwtPayload,
  action = 'respond to deductions for this rental',
): void {
  if (!isUserTenant(rental, user)) {
    throw new ForbiddenException(`Only the tenant can ${action}`);
  }
}
