import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  MaxLength,
  IsByteLength,
} from 'class-validator';
import { Match } from 'src/common/validators/match.validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @Matches(/^\d{6}$/)
  otpCode: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @IsByteLength(1, 72, { message: 'Mật khẩu tối đa 72 byte UTF-8.' })
  @MaxLength(72)
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;
}
