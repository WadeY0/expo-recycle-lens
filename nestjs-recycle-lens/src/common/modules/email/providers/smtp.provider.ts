import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailProvider, SendParams } from '../email.types';

@Injectable()
export class SmtpProvider implements EmailProvider {
  constructor(private readonly mailer: MailerService) {}

  async send(params: SendParams) {
    // dùng template + context nếu có, ngược lại fallback text/html
    return this.mailer.sendMail({
      to: params.to,
      subject: params.subject,
      template: params.template,
      context: params.context,
      text: params.text,
      html: params.html,
    });
  }

  async sendOtp(to: string, otp: string) {
    // ví dụ dùng template 'email-otp'
    return this.send({
      to,
      subject: 'Your OTP Code',
      template: 'email-otp',
      context: { email: to, otp },
    });
  }
}
