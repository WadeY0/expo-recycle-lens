import { Controller, Post, GoneException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Email Verification')
@Controller('verification')
export class VerificationsController {
  @Post('send-otp')
  sendOtp(): never {
    throw new GoneException('Use /auth/resend-otp or /auth/forgot-password');
  }

  @Post('verify-otp')
  verifyOtp(): never {
    throw new GoneException('Use /auth/verify-email or /auth/reset-password');
  }
}
