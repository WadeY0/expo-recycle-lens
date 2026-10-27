import type { WasteGuidance } from "@/features/waste-library/types/waste.types";
export interface ScanAnalysis {
  schemaVersion: 1;
  status: "recognized" | "matched" | "uncertain" | "unknown" | "hazardous";
  label: string;
  recognitionStatus?: "recognized" | "uncertain" | "unknown";
  material?: string | null;
  content?: string | null;
  contentFormat?: "html";
  source?: "third_party_vision";
  items?: string[];
  libraryMatchStatus?:
    | "matched"
    | "not_found"
    | "withheld"
    | "unavailable"
    | "not_requested";
  observations: string | null;
  modelReportedConfidence: number | null;
  confidenceMeaning: "uncalibrated_model_score" | "not_provided";
  potentiallyHazardous: boolean;
  reasons: string[];
  matchedWaste: {
    slug: string;
    articleId: string;
    name: string;
    nameEn: string;
    materials: string[];
  } | null;
  candidates: { slug: string; articleId: string; name: string }[];
  guidance: WasteGuidance | null;
  safetyAdvice: string[];
  disclaimer: string;
}
export interface VisionResult {
  id: string;
  title: string;
  image: string | null;
  type: "ai_scan";
  createdAt: string;
  classification?: {
    status: ScanAnalysis["status"];
    label: string | null;
    wasteSlug: string | null;
    articleId: string | null;
    wasteName: string | null;
  } | null;
}
export interface VisionDetail extends VisionResult {
  createdById?: string;
  content?: string;
  imageUrl?: string | null;
  analysis?: ScanAnalysis | null;
  scanAnalysis: {
    result: ScanAnalysis;
    provider: string | null;
    model: string | null;
  } | null;
}
export interface VisionHistoryResponse {
  data: VisionResult[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
export interface AnalyzeWasteResponse {
  id: string;
  imageUrl: string | null;
  createdAt: string;
  matchedWaste: ScanAnalysis["matchedWaste"];
  article: VisionDetail;
  analysis: ScanAnalysis;
  vision: {
    imageUrl: string | null;
    model: string | null;
    provider: string | null;
  };
}
