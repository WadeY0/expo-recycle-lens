import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type { ResetPasswordPayload } from "../types/auth.types";

export async function resetPasswordApi(
  payload: ResetPasswordPayload
): Promise<void> {
  await httpClient.post(PUBLIC_ROUTES.resetPassword, payload, {
    requiresAuth: false,
  });
}
