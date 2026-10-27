import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsByteLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @IsByteLength(1, 72, { message: 'Mật khẩu tối đa 72 byte UTF-8.' })
  @MaxLength(72)
  @MinLength(8)
  newPassword: string;
}
