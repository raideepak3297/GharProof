import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DisputeTenantStatus } from '../../../common/enums';

export class RespondDisputeDto {
  @IsEnum(DisputeTenantStatus)
  @IsNotEmpty()
  tenantStatus: DisputeTenantStatus;

  @IsOptional()
  @IsString()
  tenantComment?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  counterAmount?: number;
}
