import { useAuthStore } from "@/features/auth/store/auth.store";
import { createQueryClient } from "@/shared/api/query-client";
import {
  focusManager,
  onlineManager,
  QueryClientProvider,
} from "@tanstack/react-query";
import * as Network from "expo-network";
import { PropsWithChildren, useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
}

export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    let identity = useAuthStore.getState().user?.id;
    return useAuthStore.subscribe((state) => {
      if (state.user?.id !== identity) {
        identity = state.user?.id;
        queryClient.clear();
      }
    });
  }, [queryClient]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      onAppStateChange,
    );

    onlineManager.setEventListener((setOnline) => {
      const networkSubscription = Network.addNetworkStateListener((state) => {
        setOnline(!!state.isConnected);
      });

      return () => {
        networkSubscription.remove();
      };
    });

    return () => {
      appStateSubscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
