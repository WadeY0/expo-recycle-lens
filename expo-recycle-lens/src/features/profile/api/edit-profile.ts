import { httpClient } from "@/shared/api/http-client";
import { PRIVATE_ROUTES } from "@/shared/api/private-routes";
import type { EditProfilePayload } from "../types/profile.types";
import type { User } from "@/features/auth/types/auth.types";

export async function editProfileApi(payload: EditProfilePayload): Promise<User> {
  const { data } = await httpClient.patch<User>(PRIVATE_ROUTES.editUser, payload);
  return data;
}
