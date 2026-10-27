import * as path from 'path';
import { Global, Module } from '@nestjs/common';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { ConfigService } from '@nestjs/config';
import { EConfigKeys } from 'src/common/types/config-keys';
import { IMailConfig } from 'src/configs/infra/mail.config';
import { ResendProvider } from './providers/resend.provider';
import { SmtpProvider } from './providers/smtp.provider';

@Global()
@Module({
  imports: [
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): MailerOptions => {
        const mailConfig = configService.get<IMailConfig>(EConfigKeys.Mail);
        if (!mailConfig) {
          throw new Error('Missing MailConfig');
        }

        return {
          transport: {
            host: mailConfig.mailHost,
            port: Number(mailConfig.mailPort),
            secure: false,
            auth: {
              user: mailConfig.mailUsername,
              pass: mailConfig.mailPassword,
            },
          },
          defaults: {
            from: ' <no-reply>',
          },
          template: {
            dir: path.join(process.cwd(), 'src/common/modules/email/templates'),
            adapter: new EjsAdapter({
              inlineCssEnabled: true,
            }),
            options: {
              strict: false,
            },
          },
        };
      },
    }),
  ],
  providers: [ResendProvider, SmtpProvider],
  exports: [ResendProvider, SmtpProvider],
})
export class EmailModule {}
