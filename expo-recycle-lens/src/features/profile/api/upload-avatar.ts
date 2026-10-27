import { getSessionAttempt } from "@/features/auth/lib/session-generation";
import { ApiError } from "@/shared/api/api-error";
import { httpClient } from "@/shared/api/http-client";
import { PRIVATE_ROUTES } from "@/shared/api/private-routes";
import type { User } from "@/features/auth/types/auth.types";
import {
  buildScanForm,
  type ScanImageInput,
} from "@/features/scan/lib/scan-upload";
import { Platform } from "react-native";
export type AvatarImageInput = ScanImageInput & { sessionAttempt?: number };
export async function uploadAvatarApi(input: AvatarImageInput): Promise<User> {
  const sessionAttempt = input.sessionAttempt ?? getSessionAttempt();
  if (sessionAttempt !== getSessionAttempt())
    throw new ApiError("Phiên đăng nhập đã thay đổi", 409, "SESSION_CHANGED");
  const form = await buildScanForm(input, Platform.OS, "file");
  const { data } = await httpClient.post<User>(
    PRIVATE_ROUTES.uploadAvatar,
    form,
    {
      timeout: 40000,
      _sessionAttempt: sessionAttempt,
      headers: {
        "Content-Type":
          Platform.OS === "web" ? undefined : "multipart/form-data",
      },
    },
  );
  return data;
}
