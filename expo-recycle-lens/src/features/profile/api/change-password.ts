import { httpClient } from "@/shared/api/http-client";
import { PRIVATE_ROUTES } from "@/shared/api/private-routes";
import type { ChangePasswordPayload } from "../types/profile.types";

export async function changePasswordApi(
  payload: ChangePasswordPayload
): Promise<void> {
  await httpClient.patch(PRIVATE_ROUTES.changePassword, payload);
}
