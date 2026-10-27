import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type { GetArticlesParams, GetArticlesResponse } from "../types/articles.types";

export async function getArticlesApi(
  params: GetArticlesParams
): Promise<GetArticlesResponse> {
  const { data } = await httpClient.get<GetArticlesResponse>(
    PUBLIC_ROUTES.articles,
    {
      params,
    }
  );

  return data;
}
