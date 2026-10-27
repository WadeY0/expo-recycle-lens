import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type { GetCategoriesParams, GetCategoriesResponse } from "../types/categories.types";

export async function getCategoriesApi(
  params: GetCategoriesParams
): Promise<GetCategoriesResponse> {
  const { data } = await httpClient.get<GetCategoriesResponse>(
    PUBLIC_ROUTES.categories,
    {
      params,
    }
  );

  return data;
}
