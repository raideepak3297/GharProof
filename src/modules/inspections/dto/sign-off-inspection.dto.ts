import { IsBoolean } from 'class-validator';

export class SignOffInspectionDto {
  @IsBoolean({ message: 'agree must be a boolean value' })
  agree: boolean;
}
