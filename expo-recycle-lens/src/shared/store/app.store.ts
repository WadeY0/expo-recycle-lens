import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { appStorage } from "./app-storage";
import env from "@/config/env";

interface AppState {
  hasOnboarded: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      completeOnboarding: () => set({ hasOnboarded: true }),
      resetOnboarding: () => set({ hasOnboarded: false }),
    }),
    {
      name: `app-storage.${env.API_TENANT_ID}`,
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
