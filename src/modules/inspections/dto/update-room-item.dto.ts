import { IsArray, IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ItemCondition } from '../../../common/enums';

export class UpdateRoomItemDto {
  @IsOptional()
  @IsString()
  roomName?: string;

  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsEnum(ItemCondition, {
    message: 'condition must be good, minor_scratch, damaged, or not_working',
  })
  condition?: ItemCondition;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true, message: 'Each photo must be a valid Upload _id' })
  photos?: string[];
}
