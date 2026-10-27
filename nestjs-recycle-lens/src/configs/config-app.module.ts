import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import environmentValidation from './infra/environment.validation';
import AppConfig from './infra/app.config';
import JwtConfig from './infra/jwt.config';
import MailConfig from './infra/mail.config';
import GoogleOAuthConfig from './infra/google-oauth.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [AppConfig, JwtConfig, MailConfig, GoogleOAuthConfig],
      validationSchema: environmentValidation,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigAppModule {}
