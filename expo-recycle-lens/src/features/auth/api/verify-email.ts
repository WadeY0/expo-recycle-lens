import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type { VerifyEmailPayload } from "../types/auth.types";

export async function verifyEmailApi(
  payload: VerifyEmailPayload
): Promise<void> {
  await httpClient.post(PUBLIC_ROUTES.verifyEmail, payload, {
    requiresAuth: false,
  });
}
