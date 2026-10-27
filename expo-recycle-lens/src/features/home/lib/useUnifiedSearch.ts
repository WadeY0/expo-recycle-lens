import { useInfiniteQuery } from "@tanstack/react-query";

import env from "@/config/env";
import { useAuthStore } from "@/features/auth/store/auth.store";

import { getArticlesApi } from "@/features/articles/api/get-articles";

import { getWasteApi } from "@/features/waste-library/api/waste-api";

export type SearchScope = "all" | "waste" | "posts" | "knowledge";

const PAGE_SIZE = 12;

export function useUnifiedSearch(keyword: string, scope: SearchScope) {
  const userId = useAuthStore((state) => state.user?.id);

  const enabled = keyword.trim().length >= 2;

  const waste = useInfiniteQuery({
    queryKey: ["unified-search", env.API_TENANT_ID, userId, "waste", keyword],
    initialPageParam: 1,
    enabled: enabled && (scope === "all" || scope === "waste"),
    queryFn: ({ pageParam }) =>
      getWasteApi({
        keyword,
        page: pageParam,
        perPage: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
  });

  const posts = useInfiniteQuery({
    queryKey: ["unified-search", env.API_TENANT_ID, userId, "posts", keyword],
    initialPageParam: 1,
    enabled: enabled && (scope === "all" || scope === "posts"),
    queryFn: ({ pageParam }) =>
      getArticlesApi({
        type: "post",
        status: "active",
        keyword,
        page: pageParam,
        perPage: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
  });

  const knowledge = useInfiniteQuery({
    queryKey: [
      "unified-search",
      env.API_TENANT_ID,
      userId,
      "knowledge",
      keyword,
    ],
    initialPageParam: 1,
    enabled: enabled && (scope === "all" || scope === "knowledge"),
    queryFn: ({ pageParam }) =>
      getArticlesApi({
        type: "library",
        libraryScope: "legacy",
        status: "active",
        keyword,
        page: pageParam,
        perPage: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
  });

  return {
    waste,
    posts,
    knowledge,
  };
}
