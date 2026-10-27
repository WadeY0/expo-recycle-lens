import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './providers/auth.service';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { SignUpDto } from './dto/sign-up.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/re-send-otp.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { refreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-id-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sign-in')
  public signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  /**
   * Registers a new user account.
   * @route POST /auth/sign-up
   * @param {SignUpDto} signUpDto - User details for registration.
   * @returns {Promise<User>} The newly created user.
   */
  @Post('sign-up')
  @ApiOperation({
    summary: 'User Sign-Up',
    description: 'Creates a new user account with email verification.',
  })
  @ApiBody({
    type: SignUpDto,
    description: 'User details for registration',
  })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        firstName: 'John',
        lastName: 'Doe',
        email: 'user@example.com',
        isVerified: false,
        role: 'USER',
        groups: [],
        createdAt: '2024-03-07T12:00:00.000Z',
        updatedAt: '2024-03-07T12:00:00.000Z',
      },
    },
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed for request payload',
  })
  public signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('verify-email')
  public verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-otp')
  public resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Gửi lại mã khôi phục mật khẩu' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh token' })
  async refreshToken(@Body() dto: refreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('google/token')
  @ApiOperation({
    summary: 'Đăng nhập Google',
    description: 'Truyền accessToken hoặc idToken từ Google, xác thực và trả về JWT.',
  })
  async googleTokenLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto);
  }

}
