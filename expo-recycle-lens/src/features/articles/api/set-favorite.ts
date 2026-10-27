import { httpClient } from "@/shared/api/http-client";
export async function setArticleFavoriteApi(
  id: string,
  saved: boolean,
): Promise<{ isLiked: boolean; likeCount: number }> {
  const { data } = await httpClient.request<{
    isLiked: boolean;
    likeCount: number;
  }>({ method: saved ? "PUT" : "DELETE", url: `/articles/${id}/favorite` });
  return data;
}
