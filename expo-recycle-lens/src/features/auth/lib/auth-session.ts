import { storageKeys } from "@/shared/constants/storage";
import { sessionStorageOperation } from "./session-storage-operation";
import * as SecureStore from "expo-secure-store";
import env from "@/config/env";

// SecureStore keys permit letters, digits, dots, hyphens and underscores.
function key(name: string) {
  return `${env.API_TENANT_ID}.${name}`;
}

export async function readPersistedAccessToken(): Promise<string | null> {
  return sessionStorageOperation(() =>
    SecureStore.getItemAsync(key(storageKeys.accessToken)),
  );
}

export async function writePersistedAccessToken(
  accessToken: string,
): Promise<void> {
  await sessionStorageOperation(() =>
    SecureStore.setItemAsync(key(storageKeys.accessToken), accessToken),
  );
}

export async function readPersistedRefreshToken(): Promise<string | null> {
  return sessionStorageOperation(() =>
    SecureStore.getItemAsync(key(storageKeys.refreshToken)),
  );
}

export async function writePersistedRefreshToken(
  refreshToken: string,
): Promise<void> {
  await sessionStorageOperation(() =>
    SecureStore.setItemAsync(key(storageKeys.refreshToken), refreshToken),
  );
}

export async function clearPersistedSession(): Promise<void> {
  await sessionStorageOperation(async () => {
    const results = await Promise.allSettled([
      SecureStore.deleteItemAsync(key(storageKeys.accessToken)),
      SecureStore.deleteItemAsync(key(storageKeys.refreshToken)),
    ]);
    if (results.some((result) => result.status === "rejected"))
      throw new Error(
        "Không xóa được phiên trên thiết bị. Vui lòng thử đăng xuất lại.",
      );
  });
}
