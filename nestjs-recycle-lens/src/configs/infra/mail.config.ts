import { registerAs } from '@nestjs/config';
import { EConfigKeys } from 'src/common/types/config-keys';

export interface IMailConfig {
  mailHost: string;
  mailPort: string;
  mailUsername: string;
  mailPassword: string;
}

const MailConfig = registerAs(EConfigKeys.Mail, () => {
  return {
    mailHost: process.env.EMAIL_HOST,
    mailPort: parseInt(process.env.EMAIL_PORT!, 10),
    mailUsername: process.env.EMAIL_USERNAME,
    mailPassword: process.env.EMAIL_PASSWORD,
  };
});

export default MailConfig;
