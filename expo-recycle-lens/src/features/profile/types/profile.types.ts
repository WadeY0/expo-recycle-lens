import type { User } from "@/features/auth/types/auth.types";
export interface EditProfilePayload {
  fullName?: string;
  age?: number | null;
}
export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}
export type UploadAvatarResponse = User;
