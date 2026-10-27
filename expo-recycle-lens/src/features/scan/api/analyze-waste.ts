import { getSessionAttempt } from "@/features/auth/lib/session-generation";
import { httpClient } from "@/shared/api/http-client";
import { PRIVATE_ROUTES } from "@/shared/api/private-routes";
import { Platform } from "react-native";
import { buildScanForm, ScanImageInput } from "../lib/scan-upload";
import type { AnalyzeWasteResponse } from "../types/vision.types";
export type { AnalyzeWasteResponse } from "../types/vision.types";
export function createScanRequestKey(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}
export async function analyzeWasteApi(
  image: string | ScanImageInput,
  requestKey = createScanRequestKey(),
): Promise<AnalyzeWasteResponse> {
  const sessionAttempt = getSessionAttempt();
  const input = typeof image === "string" ? { uri: image } : image;
  const form = await buildScanForm(input, Platform.OS);
  const { data } = await httpClient.post<AnalyzeWasteResponse>(
    PRIVATE_ROUTES.analyzeWaste,
    form,
    {
      headers: {
        "Idempotency-Key": requestKey,
        "Content-Type":
          Platform.OS === "web" ? undefined : "multipart/form-data",
      },
      requiresAuth: true,
      _sessionAttempt: sessionAttempt,
      timeout: 65000,
    },
  );
  return data;
}
