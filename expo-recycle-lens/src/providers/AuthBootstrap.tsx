import { PropsWithChildren, useEffect, useState } from "react";

import { hydrateAuth, signOutAuth } from "@/features/auth/lib/auth-actions";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useAppStore } from "@/shared/store/app.store";
import {
  registerAccessTokenGetter,
  registerUnauthorizedHandler,
} from "@/shared/api/auth-token";
import { SplashScreen } from "@/features/splash/screens/SplashScreen";

export function AuthBootstrap({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [hasAppHydrated, setHasAppHydrated] = useState(false);

  useEffect(() => {
    registerAccessTokenGetter(() => useAuthStore.getState().accessToken);

    registerUnauthorizedHandler(async () => {
      const { status } = useAuthStore.getState();

      if (status === "authenticated") {
        await signOutAuth();
      }
    });

    // Check app storage hydration
    const unsub = useAppStore.persist.onHydrate(() => setHasAppHydrated(false));
    const unsubFinish = useAppStore.persist.onFinishHydration(() => setHasAppHydrated(true));
    
    // Initial check
    if (useAppStore.persist.hasHydrated()) {
      setHasAppHydrated(true);
    }

    const init = async () => {
      const startTime = Date.now();
      try {
        await hydrateAuth();
      } catch (e) {
        // Hydration errors ignored
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 1500 - elapsedTime);
        
        setTimeout(() => {
          setIsReady(true);
        }, remainingTime);
      }
    };

    init();
    return () => {
      unsub();
      unsubFinish();
    }
  }, []);

  if (!isReady || !hasAppHydrated) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
