import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt.guard';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { EConfigKeys } from 'src/common/types/config-keys';
import { JwtConfig } from 'src/common/types/jwt-config.interface';
import { AuthService } from './providers/auth.service';
import { HashingProvider } from './providers/hashing.provider';
import { BcryptProvider } from './providers/bcrypt.provider';
import { VerificationsModule } from '../verifications/verifications.module';
import { EmailModule } from 'src/common/modules/email/email.module';
import { TenantService } from 'src/common/services/tenant.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.get<JwtConfig>(EConfigKeys.JWT);
        if (!jwtConfig) {
          throw new Error(
            `JWT configuration is missing for key: ${EConfigKeys.JWT}`,
          );
        }
        return {
          secret: jwtConfig.secret,
          signOptions: {
            expiresIn: `${jwtConfig.accessTokenTtl}s`,
            audience: jwtConfig.audience,
            issuer: jwtConfig.issuer,
          },
        };
      },
    }),
    forwardRef(() => UsersModule),
    VerificationsModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    AuthService,
    TenantService,
    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },
  ],
  exports: [JwtAuthGuard, JwtModule, HashingProvider], // Export JwtGuard và JwtModule
})
export class AuthModule {}
