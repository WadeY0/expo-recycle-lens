import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
} from "../types/auth.types";

export async function forgotPasswordApi(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  const { data } = await httpClient.post<ForgotPasswordResponse>(
    PUBLIC_ROUTES.forgotPassword,
    payload,
    {
      requiresAuth: false,
    },
  );
  return data;
}
