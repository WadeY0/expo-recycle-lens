import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type { Category } from "../types/categories.types";

export async function getCategoryDetailApi(id: string): Promise<Category> {
  const { data } = await httpClient.get<Category>(
    `${PUBLIC_ROUTES.categories}/${id}`
  );
  return data;
}
