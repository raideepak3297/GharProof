import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PropertyAddressDto } from './property-address.dto';

export class CreateRentalDto {
  @ValidateNested()
  @Type(() => PropertyAddressDto)
  @IsNotEmptyObject()
  propertyAddress: PropertyAddressDto;

  @IsNumber()
  @Min(0)
  monthlyRent: number;

  @IsNumber()
  @Min(0)
  depositAmount: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsEmail()
  @IsOptional()
  tenantInviteEmail?: string;

  @IsString()
  @IsOptional()
  tenantInvitePhone?: string;
}
