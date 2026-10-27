import { useQuery } from "@tanstack/react-query";
import { getCategoriesApi } from "../api/get-categories";
import { getCategoryDetailApi } from "../api/get-category-detail";
import { GetCategoriesParams } from "../types/categories.types";
import env from "@/config/env";

export function useCategories(params: GetCategoriesParams) {
  return useQuery({
    queryKey: ["categories", env.API_TENANT_ID, params],
    queryFn: () => getCategoriesApi(params),
  });
}

export function useCategoryDetail(id: string) {
  return useQuery({
    queryKey: ["category", env.API_TENANT_ID, id],
    queryFn: () => getCategoryDetailApi(id),
    enabled: !!id,
  });
}

// Category dropdowns need the full server-owned list, not the first 50 rows.
export function useCategoryOptions(type: "post" | "library") {
  return useQuery({
    queryKey: ["categories", env.API_TENANT_ID, "options", type],
    queryFn: async () => {
      const first = await getCategoriesApi({
        type,
        status: "active",
        page: 1,
        perPage: 100,
      });
      const data = [...first.data];
      for (let page = 2; page <= first.totalPages; page++) {
        const next = await getCategoriesApi({
          type,
          status: "active",
          page,
          perPage: 100,
        });
        data.push(...next.data);
      }
      return { ...first, data };
    },
  });
}
