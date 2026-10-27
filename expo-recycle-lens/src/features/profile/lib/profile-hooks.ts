import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserApi, uploadAvatarApi } from "../api/profile-api";
import type { EditProfilePayload } from "../types/profile.types";
import type { AvatarImageInput } from "../api/upload-avatar";
import { applyProfileResponse } from "./profile-session";

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: EditProfilePayload) => updateUserApi(payload),
    onSuccess: (user) => {
      if (applyProfileResponse(user))
        client.setQueryData(["auth", "me", user.id], user);
    },
  });
}
export function useUploadAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AvatarImageInput) => uploadAvatarApi(input),
    onSuccess: (user) => {
      if (applyProfileResponse(user))
        client.setQueryData(["auth", "me", user.id], user);
    },
  });
}
