import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";
import type { ArticleDetail } from "../types/articles.types";

export async function getArticleByDetailApi(id: string): Promise<ArticleDetail> {
  const { data } = await httpClient.get<ArticleDetail>(
    `${PUBLIC_ROUTES.articles}/${id}`
  );
  return data;
}
