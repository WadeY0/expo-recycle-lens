import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type { SignUpPayload, SignUpResponse } from "../types/auth.types";

export async function signUpApi(
  payload: SignUpPayload
): Promise<SignUpResponse> {
  const { data } = await httpClient.post<SignUpResponse>(
    PUBLIC_ROUTES.signUp,
    payload,
    {
      requiresAuth: false,
    }
  );

  return data;
}
