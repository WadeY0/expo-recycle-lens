import { IsString, IsUUID, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'User ID received after signup',
    example: 1,
  })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'OTP code received in email',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6}$/)
  otpCode: string;
}
