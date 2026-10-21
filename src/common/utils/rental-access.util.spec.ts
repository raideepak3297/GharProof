import { ForbiddenException } from '@nestjs/common';
import { Role } from '../enums';
import { JwtPayload } from '../../modules/auth/interfaces/auth.interface';
import {
  extractEntityId,
  isUserPartyToRental,
  isUserLandlord,
  isUserTenant,
  assertRentalAccess,
  assertLandlordAccess,
  assertTenantAccess,
} from './rental-access.util';

describe('RentalAccessUtil', () => {
  const landlordUser: JwtPayload = {
    userId: 'user-landlord-1',
    email: 'landlord@example.com',
    role: Role.LANDLORD,
  };

  const tenantUser: JwtPayload = {
    userId: 'user-tenant-1',
    email: 'tenant@example.com',
    role: Role.TENANT,
  };

  const invitedTenantUser: JwtPayload = {
    userId: 'user-invited-1',
    email: 'invited@example.com',
    role: Role.TENANT,
  };

  const outsiderUser: JwtPayload = {
    userId: 'user-stranger-99',
    email: 'stranger@example.com',
    role: Role.TENANT,
  };

  const mockRental = {
    _id: 'rental-100',
    landlordId: 'user-landlord-1',
    tenantId: 'user-tenant-1',
    tenantInviteEmail: 'invited@example.com',
  };

  const mockPopulatedRental = {
    _id: 'rental-200',
    landlordId: { _id: 'user-landlord-1', name: 'Landlord' },
    tenantId: { _id: 'user-tenant-1', name: 'Tenant' },
    tenantInviteEmail: 'INVITED@example.com',
  };

  describe('extractEntityId', () => {
    it('should return undefined for null or undefined input', () => {
      expect(extractEntityId(undefined)).toBeUndefined();
      expect(extractEntityId(null)).toBeUndefined();
    });

    it('should return string representation for plain string or ObjectId', () => {
      expect(extractEntityId('12345')).toBe('12345');
    });

    it('should return _id string representation for populated object', () => {
      expect(extractEntityId({ _id: 'pop-id-1' })).toBe('pop-id-1');
    });
  });

  describe('isUserPartyToRental', () => {
    it('should return true for landlord', () => {
      expect(isUserPartyToRental(mockRental, landlordUser)).toBe(true);
      expect(isUserPartyToRental(mockPopulatedRental, landlordUser)).toBe(true);
    });

    it('should return true for accepted tenant', () => {
      expect(isUserPartyToRental(mockRental, tenantUser)).toBe(true);
      expect(isUserPartyToRental(mockPopulatedRental, tenantUser)).toBe(true);
    });

    it('should return true for invited tenant matching email (case-insensitive)', () => {
      expect(isUserPartyToRental(mockRental, invitedTenantUser)).toBe(true);
      expect(isUserPartyToRental(mockPopulatedRental, invitedTenantUser)).toBe(true);
    });

    it('should return false for unauthorized outsider', () => {
      expect(isUserPartyToRental(mockRental, outsiderUser)).toBe(false);
      expect(isUserPartyToRental(mockPopulatedRental, outsiderUser)).toBe(false);
    });

    it('should return false if rental or user is falsy', () => {
      expect(isUserPartyToRental(null, landlordUser)).toBe(false);
      expect(isUserPartyToRental(mockRental, null as any)).toBe(false);
    });
  });

  describe('isUserLandlord', () => {
    it('should return true only for landlord', () => {
      expect(isUserLandlord(mockRental, landlordUser)).toBe(true);
      expect(isUserLandlord(mockRental, tenantUser)).toBe(false);
      expect(isUserLandlord(mockRental, outsiderUser)).toBe(false);
    });
  });

  describe('isUserTenant', () => {
    it('should return true for assigned tenant or invited tenant', () => {
      expect(isUserTenant(mockRental, tenantUser)).toBe(true);
      expect(isUserTenant(mockRental, invitedTenantUser)).toBe(true);
      expect(isUserTenant(mockRental, landlordUser)).toBe(false);
      expect(isUserTenant(mockRental, outsiderUser)).toBe(false);
    });
  });

  describe('assertRentalAccess', () => {
    it('should not throw if user is party to rental', () => {
      expect(() => assertRentalAccess(mockRental, landlordUser)).not.toThrow();
      expect(() => assertRentalAccess(mockRental, tenantUser)).not.toThrow();
    });

    it('should throw ForbiddenException if user is not party to rental', () => {
      expect(() => assertRentalAccess(mockRental, outsiderUser, 'test resource')).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertLandlordAccess', () => {
    it('should not throw for landlord', () => {
      expect(() => assertLandlordAccess(mockRental, landlordUser)).not.toThrow();
    });

    it('should throw ForbiddenException for tenant or outsider', () => {
      expect(() => assertLandlordAccess(mockRental, tenantUser)).toThrow(ForbiddenException);
      expect(() => assertLandlordAccess(mockRental, outsiderUser)).toThrow(ForbiddenException);
    });
  });

  describe('assertTenantAccess', () => {
    it('should not throw for tenant or invited tenant', () => {
      expect(() => assertTenantAccess(mockRental, tenantUser)).not.toThrow();
      expect(() => assertTenantAccess(mockRental, invitedTenantUser)).not.toThrow();
    });

    it('should throw ForbiddenException for landlord or outsider', () => {
      expect(() => assertTenantAccess(mockRental, landlordUser)).toThrow(ForbiddenException);
      expect(() => assertTenantAccess(mockRental, outsiderUser)).toThrow(ForbiddenException);
    });
  });
});
