import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type { VerifyOtpPayload } from "../types/auth.types";

export async function sendOtpApi(params: { userId: string }): Promise<void> {
  await httpClient.post(PUBLIC_ROUTES.sendOtp, params, {
    requiresAuth: false,
  });
}

export async function verifyOtpApi(payload: VerifyOtpPayload): Promise<void> {
  await httpClient.post(PUBLIC_ROUTES.verifyOtp, payload, {
    requiresAuth: false,
  });
}
