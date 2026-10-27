import { useAuthStore } from "@/features/auth/store/auth.store";
import { useAppStore } from "@/shared/store/app.store";
import { router, useSegments } from "expo-router";
import { PropsWithChildren, useEffect } from "react";

export function AuthGuard({ children }: PropsWithChildren) {
  const segments = useSegments();

  const status = useAuthStore((state) => state.status);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hasOnboarded = useAppStore((state) => state.hasOnboarded);

  useEffect(() => {
    if (!isHydrated || status === "checking") return;

    const rootGroup = segments[0];
    const isAtRoot = !rootGroup;
    const inPublicGroup = rootGroup === "(public)";
    const inProtectedGroup = rootGroup === "(protected)";

    // If authenticated, redirect away from public groups (like sign-in/onboarding)
    if (status === "authenticated" && inPublicGroup) {
      router.replace("/(protected)/(tabs)");
      return;
    }

    // If unauthenticated, redirect away from protected groups
    if (status === "unauthenticated" && inProtectedGroup) {
      router.replace("/(public)/sign-in");
      return;
    }

    // If unauthenticated and in public but not onboarding, check if we should be at onboarding
    if (status === "unauthenticated" && isAtRoot) {
      router.replace(
        hasOnboarded ? "/(public)/sign-in" : "/(public)/onboarding",
      );
    }
  }, [segments, status, isHydrated, hasOnboarded]);

  return <>{children}</>;
}
