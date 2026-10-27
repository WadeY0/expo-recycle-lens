import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getWasteApi,
  getWasteFiltersApi,
  setWasteFavoriteApi,
} from "../api/waste-api";
import type { WasteQuery } from "../types/waste.types";
import { useAuthStore } from "@/features/auth/store/auth.store";
import env from "@/config/env";
export function useWastePages(
  params: Omit<WasteQuery, "page">,
  favorites = false,
) {
  const userId = useAuthStore((state) => state.user?.id);
  return useInfiniteQuery({
    queryKey: ["waste", env.API_TENANT_ID, userId, favorites, params],
    queryFn: ({ pageParam }) =>
      getWasteApi({ ...params, page: pageParam }, favorites),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.page < page.totalPages ? page.page + 1 : undefined,
  });
}
export function useWasteFilters() {
  return useQuery({
    queryKey: ["waste-filters", env.API_TENANT_ID],
    queryFn: getWasteFiltersApi,
  });
}
export function useWasteFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      setWasteFavoriteApi(id, saved),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["waste"] }),
        client.invalidateQueries({ queryKey: ["articles"] }),
        client.invalidateQueries({ queryKey: ["article"] }),
      ]);
    },
  });
}
