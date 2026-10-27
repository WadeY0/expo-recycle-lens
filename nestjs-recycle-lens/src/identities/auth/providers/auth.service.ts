import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantService } from 'src/common/services/tenant.service';
import { SignUpDto } from '../dto/sign-up.dto';
import { UsersService } from 'src/identities/users/providers/users.service';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ConfigService } from '@nestjs/config';
import { JwtConfig } from 'src/common/types/jwt-config.interface';
import { EConfigKeys } from 'src/common/types/config-keys';
import { VerificationsService } from 'src/identities/verifications/providers/verifications.service';
import { SignInDto } from '../dto/sign-in.dto';
import { IAuthToken } from '../interfaces/auth-tokens.interface';
import { User, PrismaClient, OtpPurpose } from '@prisma/client';
import { HashingProvider } from './hashing.provider';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ResendProvider } from 'src/common/modules/email/providers/resend.provider';
import { IGoogleUser } from '../strategy/google.strategy';
import { assertTokenTenant } from 'src/common/types/tenant-context';
import { randomUUID } from 'node:crypto';
import { GoogleLoginDto } from '../dto/google-id-token.dto';

interface JwtPayload {
  sub: string;
  tenantId?: string;
  tokenVersion?: number;
  tokenUse?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private tenantService: TenantService,
    private usersService: UsersService,
    private jwt: JwtService,
    private verificationsService: VerificationsService,
    private config: ConfigService,
    private resendEmail: ResendProvider,
    private hashingProvider: HashingProvider,
  ) {}

  private async getTenantPrisma(): Promise<PrismaClient> {
    return await this.tenantService.getPrismaClient();
  }

  async signUp(signUpDto: SignUpDto) {
    const user = await this.usersService.createUser(signUpDto);
    const otp = await this.verificationsService.generateAndSaveOtp(
      user.id,
      OtpPurpose.email_verification,
    );
    await this.resendEmail.sendOtp(user.email, otp.code);
    return {
      message: 'OTP sent to email',
      userId: user.id,
    };
  }

  async signUpWithoutOtp(dto: SignUpDto) {
    const user = await this.usersService.createUserWithoutOtp(dto);
    // (Optional) generate token
    return this.signToken(user.id, user.email, user.role);
  }

  public async signIn(
    dto: SignInDto,
  ): Promise<
    IAuthToken | { requiresVerification: true; userId: string; message: string }
  > {
    //   Find the user using email ID
    let user: User | null = null;

    try {
      user = await this.usersService.findOneByEmailWithPassword(dto.email);
    } catch {
      throw new UnauthorizedException('Invalid email or password');
    }

    //   Compare password to the hash
    let isEqual: boolean = false;

    try {
      isEqual = await this.hashingProvider.comparePassword(
        dto.password,
        user.password || '',
      );
    } catch (e) {
      throw new RequestTimeoutException(e, {
        description: 'Could not compare passwords',
      });
    }
    if (!isEqual) {
      throw new UnauthorizedException('Wrong email or password');
    }

    if (!user.isVerified) {
      await this.handleUnverifiedUser(user);
      return {
        requiresVerification: true,
        userId: user.id,
        message:
          'Account not verified. Please check your verification email or request a new code.',
      };
    }

    //   Send confirmation
    return this.signToken(user.id, user.email, user.role);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<IAuthToken> {
    const user = await this.verificationsService.consumeAndApply(
      dto.userId,
      dto.otpCode,
      OtpPurpose.email_verification,
      (tx) =>
        tx.user.update({
          where: { id: dto.userId },
          data: { isVerified: true },
          select: { id: true, email: true, role: true },
        }),
    );
    return this.signToken(user.id, user.email, user.role);
  }

  async resendOtp(email: string) {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('User already verified');

    const otp = await this.verificationsService.generateAndSaveOtp(
      user.id,
      OtpPurpose.email_verification,
    );
    await this.resendEmail.sendOtp(email, otp.code);

    return {
      userId: user.id,
      message: 'OTP resent successfully',
    };
  }

  async signToken(
    userId: string,
    email: string,
    role: string,
  ): Promise<IAuthToken> {
    const jwtConfig = this.config.get<JwtConfig>(EConfigKeys.JWT);
    if (!jwtConfig) {
      throw new Error(
        `JWT configuration is missing for key: ${EConfigKeys.JWT}`,
      );
    }

    const prisma = await this.getTenantPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    if (!user) throw new UnauthorizedException();
    const payload = {
      sub: userId,
      email,
      role,
      tenantId: this.tenantService.getTenantId(),
      tokenVersion: user.tokenVersion,
    };

    const token = await this.jwt.signAsync(
      { ...payload, tokenUse: 'access' },
      {
        expiresIn: `${jwtConfig.accessTokenTtl}s`,
        secret: jwtConfig.secret,
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...payload, tokenUse: 'refresh' },
      {
        secret: jwtConfig.refreshTokenSecret,
        expiresIn: `${jwtConfig.refreshTokenTtl}s`,
      },
    );
    return {
      access_token: token,
      refresh_token: refreshToken,
      role: role,
    };
  }

  private async handleUnverifiedUser(user: User) {
    try {
      const otp = await this.verificationsService.generateAndSaveOtp(
        user.id,
        OtpPurpose.email_verification,
      );
      await this.resendEmail.sendOtp(user.email, otp.code);
    } catch (error) {
      // A just-registered account already has a code. Login still navigates to
      // verification without bypassing issuance limits or exposing the code.
      if (
        !(
          error instanceof HttpException &&
          error.getStatus() === Number(HttpStatus.TOO_MANY_REQUESTS)
        )
      )
        throw error;
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const prisma = await this.getTenantPrisma();
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true },
    });
    if (user) {
      const otp = await this.verificationsService.generateAndSaveOtp(
        user.id,
        OtpPurpose.password_reset,
      );
      await this.resendEmail.sendOtp(user.email, otp.code);
    }
    return {
      userId: user?.id ?? randomUUID(),
      message: 'If the account exists, a password reset code has been sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const password = await this.hashingProvider.hashPassword(dto.password);
    await this.verificationsService.consumeAndApply(
      dto.userId,
      dto.otpCode,
      OtpPurpose.password_reset,
      (tx) =>
        tx.user.update({
          where: { id: dto.userId },
          data: { password, tokenVersion: { increment: 1 } },
          select: { id: true },
        }),
    );
    return { message: 'Mật khẩu đã được đặt lại thành công' };
  }

  async refreshToken(refreshToken: string): Promise<IAuthToken> {
    const jwtConfig = this.config.getOrThrow<JwtConfig>(EConfigKeys.JWT);
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: jwtConfig.refreshTokenSecret,
        algorithms: ['HS256'],
        audience: jwtConfig.audience,
        issuer: jwtConfig.issuer,
      });
    } catch {
      throw new ForbiddenException('Invalid or expired refresh token');
    }
    assertTokenTenant(payload.tenantId, this.tenantService.getTenantId());
    if (payload.tokenUse && payload.tokenUse !== 'refresh')
      throw new ForbiddenException('Invalid refresh token');
    const prisma = await this.getTenantPrisma();
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (
      !user?.isVerified ||
      user.tokenVersion !== (payload.tokenVersion ?? 0)
    ) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }
    // Let database outages remain 5xx; clients must not discard a valid session for them.
    return this.signToken(user.id, user.email, user.role);
  }

  async loginWithGoogle(dto: GoogleLoginDto): Promise<IAuthToken>;
  async loginWithGoogle(googleUser: IGoogleUser): Promise<IAuthToken>;
  async loginWithGoogle(
    input: GoogleLoginDto | IGoogleUser,
  ): Promise<IAuthToken> {
    if ('email' in input) {
      return this.loginWithGoogleUser(input);
    }

    let payload: {
      email?: string;
      name?: string;
      picture?: string;
      aud?: string;
      iss?: string;
      email_verified?: string;
      exp?: string;
    };
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(input.access_token)}`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) throw new Error('Invalid ID token');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object')
        throw new Error('Invalid Google response');
      const info = data as Record<string, unknown>;
      payload = {
        email: typeof info.email === 'string' ? info.email : undefined,
        name: typeof info.name === 'string' ? info.name : undefined,
        picture: typeof info.picture === 'string' ? info.picture : undefined,
        aud: typeof info.aud === 'string' ? info.aud : undefined,
        iss: typeof info.iss === 'string' ? info.iss : undefined,
        email_verified:
          typeof info.email_verified === 'string'
            ? info.email_verified
            : undefined,
        exp: typeof info.exp === 'string' ? info.exp : undefined,
      };
    } catch {
      throw new UnauthorizedException(
        'Google ID Token không hợp lệ hoặc đã hết hạn',
      );
    }

    if (
      !payload.email ||
      payload.aud !== this.config.get<string>('GOOGLE_CLIENT_ID') ||
      !['accounts.google.com', 'https://accounts.google.com'].includes(
        payload.iss ?? '',
      ) ||
      payload.email_verified !== 'true' ||
      !Number.isFinite(Number(payload.exp ?? 0)) ||
      Number(payload.exp ?? 0) <= Date.now() / 1000
    ) {
      throw new UnauthorizedException(
        'Không thể lấy thông tin từ Google ID Token',
      );
    }

    return this.loginWithGoogleUser({
      email: payload.email,
      fullName: payload.name ?? payload.email,
      avatar: payload.picture,
    });
  }

  private async loginWithGoogleUser(
    googleUser: IGoogleUser,
  ): Promise<IAuthToken> {
    const prisma = await this.getTenantPrisma();

    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          fullName: googleUser.fullName,
          avatar: googleUser.avatar ?? null,
          isVerified: true,
          password: '',
          role: 'user',
        },
      });
    } else if (!user.isVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        // An unverified password registration may belong to an attacker who
        // pre-registered this email. Google proves email ownership, not that password.
        data: {
          isVerified: true,
          password: '',
          tokenVersion: { increment: 1 },
        },
      });
    }

    return this.signToken(user.id, user.email, user.role);
  }
}
