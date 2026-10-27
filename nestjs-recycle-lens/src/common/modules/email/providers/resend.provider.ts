import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EmailProvider, SendParams } from '../email.types';
export const EMAIL_TIMEOUT_MS = 10000;
interface EmailReceipt {
  id: string;
}
@Injectable()
export class ResendProvider implements EmailProvider {
  private readonly logger = new Logger(ResendProvider.name);
  private readonly apiKey = process.env.RESEND_API_KEY ?? '';
  private readonly from = process.env.EMAIL_FROM ?? '';
  async send(params: SendParams): Promise<EmailReceipt> {
    if (!this.apiKey || !this.from)
      throw new ServiceUnavailableException('Email delivery is not configured');
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: params.to,
          subject: params.subject,
          text: params.text,
          html: params.html,
          headers: params.headers,
        }),
      });
      if (!res.ok) throw new Error('Email provider rejected delivery');
      const data: unknown = await res.json();
      if (
        !data ||
        typeof data !== 'object' ||
        !('id' in data) ||
        typeof data.id !== 'string' ||
        !data.id ||
        data.id.length > 200
      )
        throw new Error('Invalid email receipt');
      // Never log addresses, OTP, API keys or provider error bodies.
      return { id: data.id };
    } catch {
      this.logger.warn('Email delivery failed or timed out');
      throw new ServiceUnavailableException(
        'Không gửi được email. Vui lòng thử lại sau.',
      );
    }
  }
  async sendOtp(to: string, otp: string) {
    const subject = 'Your OTP Code';
    const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif"><p>Xin chào,</p><p>Mã OTP của bạn là:</p><p style="font-size:20px;font-weight:700;letter-spacing:2px">${otp}</p><p>Mã có hiệu lực trong 5 phút.</p></div>`;
    return this.send({ to, subject, html, text: `Your OTP is: ${otp}` });
  }
}
