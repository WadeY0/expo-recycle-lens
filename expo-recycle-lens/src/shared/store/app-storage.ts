import * as SecureStore from "expo-secure-store";
import type { StateStorage } from "zustand/middleware";
export const appStorage: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};
