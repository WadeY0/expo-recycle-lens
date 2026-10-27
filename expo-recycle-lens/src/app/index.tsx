import { useAuthStore } from "@/features/auth/store/auth.store";
import { useAppStore } from "@/shared/store/app.store";
import { Redirect } from "expo-router";

export default function IndexPage() {
  const status = useAuthStore((state) => state.status);
  const hasOnboarded = useAppStore((state) => state.hasOnboarded);

  if (status === "checking") {
    return null;
  }

  if (status === "authenticated") {
    return <Redirect href="/(protected)/(tabs)" />;
  }

  if (!hasOnboarded) {
    return <Redirect href="/(public)/onboarding" />;
  }

  return <Redirect href="/(public)/sign-in" />;
}
