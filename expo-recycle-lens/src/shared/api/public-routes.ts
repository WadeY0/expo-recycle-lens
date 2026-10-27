// /shared/api/public-routes.ts
export const PUBLIC_ROUTES = {
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  googleAuth: "/auth/google/token",
  verifyEmail: "/auth/verify-email",
  resendOtp: "/auth/resend-otp",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  refreshToken: "/auth/refresh-token",
  sendOtp: "/verification/send-otp",
  verifyOtp: "/verification/verify-otp",
  categories: "/categories",
  articles: "/articles",
} as const;

