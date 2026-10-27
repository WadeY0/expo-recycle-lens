import { httpClient } from "@/shared/api/http-client";
import { PRIVATE_ROUTES } from "@/shared/api/private-routes";
import { GetArticlesParams, GetArticlesResponse } from "../types/articles.types";

export async function getLikedArticlesApi(
  params: GetArticlesParams
): Promise<GetArticlesResponse> {
  const { data } = await httpClient.get<GetArticlesResponse>(
    PRIVATE_ROUTES.likedArticles,
    {
      params,
    }
  );

  return data;
}
