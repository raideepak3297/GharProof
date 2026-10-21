import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DisputeCategory } from '../../../common/enums';

export class CreateDisputeDto {
  @IsEnum(DisputeCategory)
  @IsNotEmpty()
  category: DisputeCategory;

  @IsNumber()
  @Min(0)
  proposedDeduction: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsMongoId()
  roomItemId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  evidencePhotos?: string[];
}
