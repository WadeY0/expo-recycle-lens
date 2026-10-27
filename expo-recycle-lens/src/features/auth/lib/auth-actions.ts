import { toApiError } from "@/shared/api/api-error";
import { router } from "expo-router";
import { forgotPasswordApi } from "../api/forgot-password";
import { getMeApi } from "../api/get-me";
import { resendOtpApi } from "../api/resend-otp";
import { resetPasswordApi } from "../api/reset-password";
import { signInApi } from "../api/sign-in";
import { signUpApi } from "../api/sign-up";
import { verifyEmailApi } from "../api/verify-email";
import { googleAuthApi } from "../api/google-auth";

import { useAuthStore } from "../store/auth.store";
import type {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  GoogleAuthPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  SignInPayload,
  SignInResponse,
  SignUpPayload,
  VerifyEmailPayload,
} from "../types/auth.types";
import {
  clearPersistedSession,
  readPersistedAccessToken,
  writePersistedAccessToken,
  writePersistedRefreshToken,
} from "./auth-session";

import { getSessionAttempt, beginSessionAttempt } from "./session-generation";
export { getSessionAttempt } from "./session-generation";

let hydratePromise: Promise<void> | null = null;

export async function hydrateAuth(): Promise<void> {
  const store = useAuthStore.getState();

  if (store.isHydrated) return;
  if (hydratePromise) return hydratePromise;

  const attempt = getSessionAttempt();
  hydratePromise = (async () => {
    try {
      const persistedAccessToken = await readPersistedAccessToken();

      if (attempt !== getSessionAttempt()) return;
      if (!persistedAccessToken) {
        useAuthStore.getState().clearSession();
        return;
      }

      useAuthStore.getState().setAccessToken(persistedAccessToken);

      const me = await getMeApi();

      const currentAccessToken = useAuthStore.getState().accessToken;
      if (attempt !== getSessionAttempt() || !currentAccessToken) return;
      useAuthStore.getState().setSession({
        accessToken: currentAccessToken,
        user: me,
      });
    } catch (error) {
      if (attempt !== getSessionAttempt()) return;
      const apiError = toApiError(error);
      try {
        if (apiError.status === 401 || apiError.status === 403)
          await clearPersistedSession();
      } finally {
        if (attempt === getSessionAttempt())
          useAuthStore.getState().clearSession();
      }
    } finally {
      if (attempt === getSessionAttempt())
        useAuthStore.getState().setHydrated(true);
    }
  })().finally(() => {
    hydratePromise = null;
  });

  return hydratePromise;
}

async function establishSession(
  response: SignInResponse,
  attempt: number,
): Promise<void> {
  if (attempt !== getSessionAttempt())
    throw new Error("Phiên đăng nhập đã thay đổi");
  if (!response.access_token || !response.refresh_token)
    throw new Error("Phản hồi xác thực không hợp lệ");
  useAuthStore.getState().setAccessToken(response.access_token);
  await Promise.all([
    writePersistedAccessToken(response.access_token),
    writePersistedRefreshToken(response.refresh_token),
  ]);
  if (attempt !== getSessionAttempt()) {
    if (!useAuthStore.getState().accessToken) await clearPersistedSession();
    throw new Error("Phiên đăng nhập đã thay đổi");
  }
  const user = await getMeApi();
  const token = useAuthStore.getState().accessToken;
  if (attempt !== getSessionAttempt() || !token)
    throw new Error("Phiên đăng nhập đã thay đổi");
  // getMe may have renewed the access token; never restore the response's old token.
  useAuthStore.getState().setSession({ accessToken: token, user });
  useAuthStore.getState().setHydrated(true);
}
async function handleLoginError(error: unknown, attempt: number) {
  if (attempt === getSessionAttempt()) {
    const status = toApiError(error).status;
    try {
      if (status === 401 || status === 403) await clearPersistedSession();
    } finally {
      if (attempt === getSessionAttempt()) {
        useAuthStore.getState().clearSession();
        useAuthStore.getState().setHydrated(true);
      }
    }
  }
  throw toApiError(error);
}
export async function signInAuth(
  payload: SignInPayload,
): Promise<SignInResponse | void> {
  const attempt = beginSessionAttempt();
  useAuthStore.getState().setLoading(true);
  try {
    const response = await signInApi(payload);
    if (attempt !== getSessionAttempt())
      throw new Error("Phiên đăng nhập đã thay đổi");
    if (response.requiresVerification && response.userId) {
      router.push({
        pathname: "/(public)/verify-email",
        params: { userId: response.userId, email: payload.email },
      });
      return response;
    }
    await establishSession(response, attempt);
    return response;
  } catch (error) {
    await handleLoginError(error, attempt);
  } finally {
    if (attempt === getSessionAttempt())
      useAuthStore.getState().setLoading(false);
  }
}

export async function signUpAuth(payload: SignUpPayload): Promise<string> {
  useAuthStore.getState().setLoading(true);

  try {
    const response = await signUpApi(payload);
    return response.userId;
  } catch (error) {
    throw toApiError(error);
  } finally {
    useAuthStore.getState().setLoading(false);
  }
}

export async function verifyEmailAuth(
  payload: VerifyEmailPayload,
): Promise<void> {
  useAuthStore.getState().setLoading(true);

  try {
    await verifyEmailApi(payload);
  } catch (error) {
    throw toApiError(error);
  } finally {
    useAuthStore.getState().setLoading(false);
  }
}

export async function resendOtpAuth(payload: ResendOtpPayload): Promise<void> {
  useAuthStore.getState().setLoading(true);

  try {
    await resendOtpApi(payload);
  } catch (error) {
    throw toApiError(error);
  } finally {
    useAuthStore.getState().setLoading(false);
  }
}

export async function forgotPasswordAuth(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  useAuthStore.getState().setLoading(true);

  try {
    return await forgotPasswordApi(payload);
  } catch (error) {
    throw toApiError(error);
  } finally {
    useAuthStore.getState().setLoading(false);
  }
}

export async function resetPasswordAuth(
  payload: ResetPasswordPayload,
): Promise<void> {
  useAuthStore.getState().setLoading(true);

  try {
    await resetPasswordApi(payload);
  } catch (error) {
    throw toApiError(error);
  } finally {
    useAuthStore.getState().setLoading(false);
  }
}

export async function googleAuth(
  payload: GoogleAuthPayload,
  expectedAttempt?: number,
): Promise<SignInResponse | void> {
  if (expectedAttempt !== undefined && expectedAttempt !== getSessionAttempt())
    throw new Error("Phiên đăng nhập đã thay đổi");
  const attempt = beginSessionAttempt();
  useAuthStore.getState().setLoading(true);
  try {
    const response = await googleAuthApi(payload);
    await establishSession(response, attempt);
    return response;
  } catch (error) {
    await handleLoginError(error, attempt);
  } finally {
    if (attempt === getSessionAttempt())
      useAuthStore.getState().setLoading(false);
  }
}

export async function signOutAuth(): Promise<void> {
  const attempt = beginSessionAttempt();
  useAuthStore.getState().clearSession();
  useAuthStore.getState().setLoading(true);

  try {
    await clearPersistedSession();
  } finally {
    if (attempt === getSessionAttempt()) {
      useAuthStore.getState().clearSession();
      useAuthStore.getState().setHydrated(true);
      useAuthStore.getState().setLoading(false);
    }
  }
}
