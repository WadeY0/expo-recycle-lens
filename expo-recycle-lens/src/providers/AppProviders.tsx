import { PropsWithChildren, useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthBootstrap } from "./AuthBootstrap";
import { AuthGuard } from "./AuthGuard";
import { QueryProvider } from "./QueryProvider";
import Toast from "react-native-toast-message";
import { configureGoogleSignIn } from "@/features/auth/lib/google-signin-helper";

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    void configureGoogleSignIn();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthBootstrap>
          <QueryProvider>
            <AuthGuard>
              {children}
              <Toast />
            </AuthGuard>
          </QueryProvider>
        </AuthBootstrap>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
