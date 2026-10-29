import { IsOptional, IsString } from 'class-validator';

export class ListTenantsDto {
  @IsString()
  @IsOptional()
  search?: string;
}
