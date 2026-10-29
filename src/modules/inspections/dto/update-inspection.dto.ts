import { IsOptional, IsString } from 'class-validator';

export class UpdateInspectionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
