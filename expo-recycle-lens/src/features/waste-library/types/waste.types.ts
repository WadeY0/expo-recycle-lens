export interface WasteGuidance {
  recycling:
    | "conditional"
    | "special_collection"
    | "not_curbside"
    | "compostable";
  uncertainty: string;
  preparation: string[];
  disposal: string[];
  warnings: string[];
  hazardous: boolean;
  keywords: string[];
  examples: string[];
  illustration: { emoji: string; alt: string };
  provenance: {
    title: string;
    url: string;
    publisher: string;
    scope: string;
    verification: "reference_not_live_verified";
  }[];
  localContext: string;
  version: string;
  reviewState: "general_guidance_check_local_rules";
}
export interface WasteItem {
  slug: string;
  articleId: string;
  name: string;
  nameEn: string;
  aliases: string[];
  materials: string[];
  image: string | null;
  category: { id: string; title: string } | null;
  isFavorite: boolean;
  guidance: WasteGuidance;
  version: string;
}
export interface WasteQuery {
  keyword?: string;
  material?: string;
  categoryId?: string;
  page?: number;
  perPage?: number;
}
export interface WastePage {
  data: WasteItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
export interface WasteFilters {
  categories: { id: string; title: string }[];
  materials: { id: string; name: string }[];
}
export const RECYCLING_LABELS: Record<WasteGuidance["recycling"], string> = {
  conditional: "Tái chế nếu nơi thu gom chấp nhận",
  special_collection: "Cần điểm thu gom riêng",
  not_curbside: "Không mặc định bỏ thùng tái chế chung",
  compostable: "Ủ/thu gom hữu cơ theo quy trình phù hợp",
};
