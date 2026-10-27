import { httpClient } from "@/shared/api/http-client";
import { PUBLIC_ROUTES } from "@/shared/api/public-routes";

export async function toggleLikeApi(id: string): Promise<void> {
  await httpClient.post(`${PUBLIC_ROUTES.articles}/${id}/like`);
}
