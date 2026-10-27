import env from "@/config/env";
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/api-error";
import type {
  AnalyzeWasteResponse,
  ScanAnalysis,
  VisionDetail,
} from "../types/vision.types";
import { assertScanSession } from "./scan-attempt";

export function visionDetailKey(
  tenantId: string,
  userId: string | undefined,
  id: string,
) {
  return ["vision", "detail", tenantId, userId, id] as const;
}

// Only authenticated POST data can populate this cache, never route JSON.
export function cacheScanResult(
  client: QueryClient,
  result: AnalyzeWasteResponse,
  ownerId: string,
  generation: number,
) {
  assertScanSession(generation, ownerId);
  const analysis = result.analysis;
  const optionalText = (value: unknown, max: number) =>
    value == null || (typeof value === "string" && value.length <= max);
  if (
    !result.id ||
    result.id !== result.article?.id ||
    result.article.type !== "ai_scan" ||
    result.article.createdById !== ownerId ||
    !analysis ||
    analysis.schemaVersion !== 1 ||
    typeof analysis.label !== "string" ||
    !analysis.label.trim() ||
    analysis.label.length > 160 ||
    !optionalText(analysis.material, 160) ||
    !optionalText(analysis.observations, 2000) ||
    !optionalText(
      analysis.content,
      analysis.contentFormat === "html" ? 64000 : 16000,
    ) ||
    !optionalText(result.imageUrl, 2048) ||
    !Array.isArray(analysis.reasons) ||
    !analysis.reasons.every((value) => typeof value === "string") ||
    !Array.isArray(analysis.candidates) ||
    !analysis.candidates.every(
      (value) =>
        value &&
        typeof value.articleId === "string" &&
        typeof value.name === "string" &&
        typeof value.slug === "string",
    ) ||
    (analysis.items != null &&
      (!Array.isArray(analysis.items) ||
        analysis.items.length > 10 ||
        !analysis.items.every((value) => typeof value === "string"))) ||
    !["recognized", "matched", "unknown", "uncertain", "hazardous"].includes(
      analysis.status,
    ) ||
    !Array.isArray(analysis.safetyAdvice) ||
    !analysis.safetyAdvice.every((value) => typeof value === "string") ||
    typeof analysis.disclaimer !== "string" ||
    typeof analysis.potentiallyHazardous !== "boolean"
  ) {
    throw new ApiError(
      "Kết quả quét không hợp lệ. Vui lòng thử lại.",
      502,
      "INVALID_SCAN_RESULT",
    );
  }
  const detail: VisionDetail = {
    ...result.article,
    image: result.imageUrl,
    analysis,
  };
  client.setQueryData(
    visionDetailKey(env.API_TENANT_ID, ownerId, result.id),
    detail,
  );
  return result.id;
}

export function recognitionLabel(analysis: ScanAnalysis) {
  if (
    !analysis.recognitionStatus &&
    analysis.status === "unknown" &&
    analysis.reasons.includes("no_exact_library_match")
  )
    return "Gợi ý AI đã lưu · chưa có đối chiếu thư viện";
  const status =
    analysis.recognitionStatus ??
    (analysis.status === "uncertain"
      ? "uncertain"
      : analysis.status === "unknown"
        ? "unknown"
        : "recognized");
  return status === "uncertain"
    ? "AI chưa chắc chắn — cần kiểm tra thêm"
    : status === "unknown"
      ? "AI chưa nhận dạng được"
      : "Kết quả nhận dạng do AI cung cấp";
}
