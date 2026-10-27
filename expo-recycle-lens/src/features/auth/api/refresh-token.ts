import axios from "axios";
import env from "@/config/env";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type { RefreshTokenPayload, SignInResponse } from "../types/auth.types";

export async function refreshTokenApi(
  payload: RefreshTokenPayload,
): Promise<SignInResponse> {
  const { data } = await axios.post<any>(
    `${env.API_URL}${PUBLIC_ROUTES.refreshToken}`,
    payload,
    {
      timeout: 15000,
      headers: {
        "x-tenant-id": env.API_TENANT_ID,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
  );

  return data.data || data;
}
