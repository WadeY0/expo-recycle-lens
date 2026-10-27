import { httpClient } from "@/shared/api/http-client";
import { PRIVATE_ROUTES } from "@/shared/api/private-routes";
import type { User } from "../types/auth.types";

export async function getMeApi(): Promise<User> {
  const { data } = await httpClient.get<any>(PRIVATE_ROUTES.me);
  return data.data || data;
}

