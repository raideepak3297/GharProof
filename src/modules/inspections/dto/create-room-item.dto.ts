import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ItemCondition } from '../../../common/enums';

export class CreateRoomItemDto {
  @IsString()
  @IsNotEmpty()
  roomName: string;

  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsEnum(ItemCondition, {
    message: 'condition must be good, minor_scratch, damaged, or not_working',
  })
  condition: ItemCondition;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true, message: 'Each photo must be a valid Upload _id' })
  photos?: string[];
}
