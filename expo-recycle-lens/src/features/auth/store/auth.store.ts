import { create } from "zustand";
import type { AuthStatus, User } from "../types/auth.types";

interface SetSessionPayload {
  accessToken: string;
  user: User;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
  isHydrated: boolean;
  isLoading: boolean;

  setAccessToken: (accessToken: string | null) => void;
  setSession: (payload: SetSessionPayload) => void;
  clearSession: () => void;
  setHydrated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  accessToken: null,
  status: "checking" as AuthStatus,
  isHydrated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setAccessToken: (accessToken) =>
    set((state) => ({
      ...state,
      accessToken,
    })),

  setSession: ({ accessToken, user }) =>
    set((state) => ({
      ...state,
      accessToken,
      user,
      status: "authenticated",
    })),

  clearSession: () =>
    set((state) => ({
      ...state,
      accessToken: null,
      user: null,
      status: "unauthenticated",
    })),

  setHydrated: (value) =>
    set((state) => ({
      ...state,
      isHydrated: value,
    })),

  setLoading: (value) =>
    set((state) => ({
      ...state,
      isLoading: value,
    })),

  reset: () => set(initialState),
}));
