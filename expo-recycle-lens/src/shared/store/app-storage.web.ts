import type { StateStorage } from "zustand/middleware";
// Non-sensitive onboarding preference only; auth tokens use sessionStorage separately.
export const appStorage: StateStorage = {
  getItem: (name) => {
    try {
      return typeof window === "undefined"
        ? null
        : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      if (typeof window !== "undefined")
        window.localStorage.setItem(name, value);
    } catch {
      /* Optional preference can remain in memory. */
    }
  },
  removeItem: (name) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
    } catch {
      /* Optional preference can remain in memory. */
    }
  },
};
