import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'User ID received after signup',
    example: 1,
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'OTP code received in email',
    example: '123456'
  })
  @IsString()
  otpCode: string;
}
