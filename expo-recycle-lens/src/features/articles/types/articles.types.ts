import type { WasteGuidance } from "@/features/waste-library/types/waste.types";
export interface Article {
  id: string;
  title: string;
  image: string | null;
  description?: string | null;
  content: string;
  wasteItem?: {
    slug: string;
    nameEn: string;
    materials: string[];
    guidance: WasteGuidance;
    version: string;
  } | null;
  status: string;
  type: "post" | "library";
  categoryId: string | null;
  isLiked: boolean;
  _count: {
    likes: number;
  };
  category?: {
    id: string;
    title: string;
  } | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ArticleDetail = Article;

export interface GetArticlesParams {
  sortBy?: "latest" | "oldest" | "title_asc" | "title_desc";
  libraryScope?: "canonical" | "legacy";
  status?: string;
  type?: "post" | "library";
  categoryId?: string;
  keyword?: string;
  page?: number;
  perPage?: number;
}

export interface GetArticlesResponse {
  data: Article[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
