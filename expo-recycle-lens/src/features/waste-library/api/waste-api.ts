import { httpClient } from "@/shared/api/http-client";
import type {
  WasteFilters,
  WasteItem,
  WastePage,
  WasteQuery,
} from "../types/waste.types";
export async function getWasteApi(
  params: WasteQuery = {},
  favorites = false,
): Promise<WastePage> {
  const { data } = await httpClient.get<WastePage>(
    favorites ? "/waste/favorites" : "/waste",
    { params },
  );
  return data;
}
export async function getWasteFiltersApi(): Promise<WasteFilters> {
  const { data } = await httpClient.get<WasteFilters>("/waste/filters");
  return data;
}
export async function getWasteDetailApi(id: string): Promise<WasteItem> {
  const { data } = await httpClient.get<WasteItem>(
    `/waste/${encodeURIComponent(id)}`,
  );
  return data;
}
export async function setWasteFavoriteApi(id: string, saved: boolean) {
  const path = `/waste/${encodeURIComponent(id)}/favorite`;
  const { data } = saved
    ? await httpClient.put<{ articleId: string; isFavorite: boolean }>(path)
    : await httpClient.delete<{ articleId: string; isFavorite: boolean }>(path);
  return data;
}
