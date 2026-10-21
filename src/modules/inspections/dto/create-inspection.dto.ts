import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InspectionType } from '../../../common/enums';

export class CreateInspectionDto {
  @IsEnum(InspectionType, {
    message: 'type must be either move_in or move_out',
  })
  type: InspectionType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  rentalId?: string;
}
