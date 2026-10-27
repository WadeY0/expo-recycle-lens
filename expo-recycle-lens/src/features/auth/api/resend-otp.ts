import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type { ResendOtpPayload } from "../types/auth.types";

export async function resendOtpApi(payload: ResendOtpPayload): Promise<void> {
  await httpClient.post(PUBLIC_ROUTES.resendOtp, payload, {
    requiresAuth: false,
  });
}
