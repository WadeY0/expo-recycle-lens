import { getSessionAttempt } from "@/features/auth/lib/session-generation";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { ApiError } from "@/shared/api/api-error";
import { analyzeWasteApi, createScanRequestKey } from "../api/analyze-waste";
import { validateScanImage, type ScanImageInput } from "./scan-upload";
export interface ScanAttempt {
  image: ScanImageInput;
  key: string;
  ownerId: string;
  generation: number;
}
export function assertScanSession(generation: number, ownerId?: string) {
  const state = useAuthStore.getState();
  if (
    generation !== getSessionAttempt() ||
    !state.accessToken ||
    !state.user ||
    (ownerId && state.user.id !== ownerId)
  )
    throw new ApiError(
      "Phiên đăng nhập đã thay đổi. Vui lòng chọn ảnh lại.",
      409,
      "SESSION_CHANGED",
    );
}
export function createScanAttempt(
  image: ScanImageInput,
  generation = getSessionAttempt(),
): ScanAttempt {
  assertScanSession(generation);
  validateScanImage(image);
  return {
    image,
    key: createScanRequestKey(),
    ownerId: useAuthStore.getState().user!.id,
    generation,
  };
}
export async function submitScanAttempt(attempt: ScanAttempt) {
  assertScanSession(attempt.generation, attempt.ownerId);
  const result = await analyzeWasteApi(attempt.image, attempt.key);
  assertScanSession(attempt.generation, attempt.ownerId);
  return result;
}
export function canRetryScan(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.status === 0 ||
      error.status === 408 ||
      error.status === 429 ||
      error.status >= 500)
  );
}
