import env from "@/config/env";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getVisionHistoryApi, getVisionDetailApi } from "../api/vision-history";
import { visionDetailKey } from "./scan-result";

const VISION_HISTORY_PER_PAGE = 20;

export function useVisionHistory(params?: { page?: number; perPage?: number }) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["vision", "history", env.API_TENANT_ID, userId, params],
    queryFn: () => getVisionHistoryApi(params),
  });
}

export function useInfiniteVisionHistory(perPage = VISION_HISTORY_PER_PAGE) {
  const userId = useAuthStore((state) => state.user?.id);
  return useInfiniteQuery({
    queryKey: [
      "vision",
      "history",
      "infinite",
      env.API_TENANT_ID,
      userId,
      { perPage },
    ],
    queryFn: ({ pageParam }) =>
      getVisionHistoryApi({ page: pageParam, perPage }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (count, page) => count + page.data.length,
        0,
      );

      if (loadedCount < lastPage.total) {
        return allPages.length + 1;
      }

      return undefined;
    },
  });
}

export function useVisionDetail(id: string) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: visionDetailKey(env.API_TENANT_ID, userId, id),
    queryFn: () => getVisionDetailApi(id),
    enabled: !!id && !!userId,
    staleTime: 30_000,
    refetchOnMount: true,
  });
}
