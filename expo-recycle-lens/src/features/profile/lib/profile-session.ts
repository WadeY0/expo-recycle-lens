import { useAuthStore } from "@/features/auth/store/auth.store";
import type { User } from "@/features/auth/types/auth.types";
export function applyProfileResponse(user: User): boolean {
  const current = useAuthStore.getState();
  if (!current.accessToken || current.user?.id !== user.id) return false;
  current.setSession({ accessToken: current.accessToken, user });
  return true;
}
