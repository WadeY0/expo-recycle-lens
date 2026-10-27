export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export interface User {
  id: string;
  email: string;
  fullName: string;
  age?: number | null;
  avatar?: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  fullName: string;
  age?: number;
}

export interface SignInResponse {
  access_token: string;
  refresh_token: string;
  role: string;
  message?: string;
  requiresVerification?: boolean;
  userId?: string;
}

export interface SignUpResponse {
  message: string;
  userId: string;
}

export interface GoogleAuthPayload {
  access_token: string;
}

export interface VerifyEmailPayload {
  userId: string;
  otpCode: string;
}

export interface ResendOtpPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  userId: string;
  message: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  userId: string;
  otpCode: string;
  password: string;
  confirmPassword: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface VerifyOtpPayload {
  userId: string;
  otpCode: string;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}
