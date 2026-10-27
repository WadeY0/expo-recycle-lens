import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import env from "@/config/env";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getArticlesApi } from "../api/get-articles";
import { getArticleByDetailApi } from "../api/get-article-detail";
import { getLikedArticlesApi } from "../api/get-liked-articles";
import { setArticleFavoriteApi } from "../api/set-favorite";
import type { GetArticlesParams } from "../types/articles.types";

function useIdentity() {
  return [env.API_TENANT_ID, useAuthStore((state) => state.user?.id)] as const;
}
export function useArticles(params: GetArticlesParams) {
  const identity = useIdentity();
  return useQuery({
    queryKey: ["articles", ...identity, params],
    queryFn: () => getArticlesApi(params),
  });
}
export function useArticleDetail(id: string) {
  const identity = useIdentity();
  return useQuery({
    queryKey: ["article", ...identity, id],
    queryFn: () => getArticleByDetailApi(id),
    enabled: !!id,
  });
}
export function useLikedArticles(params: GetArticlesParams) {
  const identity = useIdentity();
  return useQuery({
    queryKey: ["articles", ...identity, "liked", params],
    queryFn: () => getLikedArticlesApi(params),
  });
}
// Keep the existing hook name/call pattern; the mutation sets an explicit desired state.
export function useToggleLike(articleId: string, isLiked = false) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => setArticleFavoriteApi(articleId, !isLiked),
    onSettled: async () => {
      await Promise.all(
        ["waste", "article", "articles"].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });
}
export function useArticlePages(
  params: Omit<GetArticlesParams, "page">,
  favorites = false,
) {
  const identity = useIdentity();
  return useInfiniteQuery({
    queryKey: ["articles", ...identity, "pages", favorites, params],
    queryFn: ({ pageParam }) =>
      (favorites ? getLikedArticlesApi : getArticlesApi)({
        ...params,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.page < page.totalPages ? page.page + 1 : undefined,
  });
}
export function useLibraryKnowledge(
  params: Omit<GetArticlesParams, "page">,
  favorites = false,
) {
  return useArticlePages(
    { ...params, type: "library", libraryScope: "legacy", perPage: 12 },
    favorites,
  );
}
