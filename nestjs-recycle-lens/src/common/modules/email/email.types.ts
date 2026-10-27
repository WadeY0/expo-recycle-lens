export type Address = string | string[];

export interface SendParams {
  to: Address;
  subject: string;
  text?: string;
  html?: string;
  template?: string; // chỉ dùng cho SMTP/Mailer
  context?: Record<string, any>; // chỉ dùng cho SMTP/Mailer
  headers?: Record<string, string>;
}

export interface EmailProvider {
  send(params: SendParams): Promise<any>;
  sendOtp(to: string, otp: string): Promise<any>;
}
