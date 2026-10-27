import { sessionStorageOperation } from "./session-storage-operation";
import env from "@/config/env";
import { storageKeys } from "@/shared/constants/storage";
// Browser tab session only. Native continues to use SecureStore. Never persist in localStorage.
function key(name: string) {
  return `${env.API_TENANT_ID}:${name}`;
}
function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}
export async function readPersistedAccessToken(): Promise<string | null> {
  return sessionStorageOperation(
    async () => storage()?.getItem(key(storageKeys.accessToken)) ?? null,
  );
}
export async function readPersistedRefreshToken(): Promise<string | null> {
  return sessionStorageOperation(
    async () => storage()?.getItem(key(storageKeys.refreshToken)) ?? null,
  );
}
export async function writePersistedAccessToken(value: string): Promise<void> {
  await sessionStorageOperation(async () => {
    storage()?.setItem(key(storageKeys.accessToken), value);
  });
}
export async function writePersistedRefreshToken(value: string): Promise<void> {
  await sessionStorageOperation(async () => {
    storage()?.setItem(key(storageKeys.refreshToken), value);
  });
}
export async function clearPersistedSession(): Promise<void> {
  await sessionStorageOperation(async () => {
    storage()?.removeItem(key(storageKeys.accessToken));
    storage()?.removeItem(key(storageKeys.refreshToken));
  });
}
