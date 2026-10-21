import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PropertyAddressDto } from './property-address.dto';

export class UpdateRentalDto {
  @ValidateNested()
  @Type(() => PropertyAddressDto)
  @IsOptional()
  propertyAddress?: PropertyAddressDto;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyRent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  depositAmount?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEmail()
  @IsOptional()
  tenantInviteEmail?: string;

  @IsString()
  @IsOptional()
  tenantInvitePhone?: string;
}
