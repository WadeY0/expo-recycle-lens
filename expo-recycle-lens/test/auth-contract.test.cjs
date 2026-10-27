/* global jest, test, expect, beforeEach, afterEach */
jest.mock("@/config/env", () => ({
  __esModule: true,
  default: { API_URL: "http://test.invalid", API_TENANT_ID: "RECYCLELENS" },
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const axios = require("axios").default;
const { AxiosError } = require("axios");
const storage = require("expo-secure-store");
const { refreshTokenApi } = require("../src/features/auth/api/refresh-token");
const { httpClient } = require("../src/shared/api/http-client");
const {
  hydrateAuth,
  forgotPasswordAuth,
} = require("../src/features/auth/lib/auth-actions");
const { useAuthStore } = require("../src/features/auth/store/auth.store");
const { registerAccessTokenGetter } = require("../src/shared/api/auth-token");

function unauthorized(config) {
  return new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
    status: 401,
    data: {},
    headers: {},
    config,
  });
}
function ok(config, data) {
  return { data, status: 200, statusText: "OK", headers: {}, config };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().reset();
  registerAccessTokenGetter(() => useAuthStore.getState().accessToken);
  storage.getItemAsync.mockResolvedValue("persisted-refresh");
});
afterEach(() => jest.restoreAllMocks());

test("native session writes, reads and logout use only the configured tenant keys", async () => {
  const env = require("../src/config/env").default;
  const session = require("../src/features/auth/lib/auth-session");
  const map = new Map();
  storage.setItemAsync.mockImplementation(async (key, value) => {
    map.set(key, value);
  });
  storage.getItemAsync.mockImplementation(async (key) => map.get(key) ?? null);
  storage.deleteItemAsync.mockImplementation(async (key) => {
    map.delete(key);
  });
  const original = env.API_TENANT_ID;
  try {
    await session.writePersistedAccessToken("A-access");
    await session.writePersistedRefreshToken("A-refresh");
    expect([...map.keys()].every((key) => key.startsWith("RECYCLELENS."))).toBe(true);
    env.API_TENANT_ID = "APP_B";
    expect(await session.readPersistedAccessToken()).toBeNull();
    expect(await session.readPersistedRefreshToken()).toBeNull();
    await session.writePersistedAccessToken("B-access");
    await session.clearPersistedSession();
    env.API_TENANT_ID = original;
    expect(await session.readPersistedAccessToken()).toBe("A-access");
    expect(await session.readPersistedRefreshToken()).toBe("A-refresh");
  } finally {
    env.API_TENANT_ID = original;
    storage.setItemAsync.mockResolvedValue(undefined);
    storage.deleteItemAsync.mockResolvedValue(undefined);
    storage.getItemAsync.mockResolvedValue("persisted-refresh");
  }
});

test("refresh sends canonical payload and tenant header through the nonrecursive client", async () => {
  const post = jest.spyOn(axios, "post").mockResolvedValue({
    data: { access_token: "access", refresh_token: "refresh" },
  });
  await refreshTokenApi({ refreshToken: "stored" });
  expect(post).toHaveBeenCalledWith(
    "http://test.invalid/auth/refresh-token",
    { refreshToken: "stored" },
    expect.objectContaining({
      timeout: 15000,
      headers: expect.objectContaining({ "x-tenant-id": "RECYCLELENS" }),
    }),
  );
});

test("forgot-password action forwards the userId required by reset navigation", async () => {
  httpClient.defaults.adapter = (config) =>
    Promise.resolve(ok(config, { userId: "reset-user", message: "sent" }));
  await expect(
    forgotPasswordAuth({ email: "user@example.invalid" }),
  ).resolves.toEqual({ userId: "reset-user", message: "sent" });
});

test("hydration retains the renewed access token after getMe triggers a refresh", async () => {
  const post = jest.spyOn(axios, "post").mockResolvedValue({
    data: { access_token: "renewed", refresh_token: "new-refresh" },
  });
  storage.getItemAsync.mockImplementation((key) =>
    Promise.resolve(key.includes("refresh") ? "stored-refresh" : "expired"),
  );
  httpClient.defaults.adapter = (config) =>
    config.headers.Authorization === "Bearer renewed"
      ? Promise.resolve(
          ok(config, { id: "user", email: "user@example.invalid" }),
        )
      : Promise.reject(unauthorized(config));
  await hydrateAuth();
  expect(post).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().accessToken).toBe("renewed");
  expect(useAuthStore.getState().status).toBe("authenticated");
});

test("temporary refresh network failure preserves persisted credentials", async () => {
  jest
    .spyOn(axios, "post")
    .mockRejectedValue(new AxiosError("Network unavailable", "ERR_NETWORK"));
  useAuthStore.getState().setAccessToken("expired");
  httpClient.defaults.adapter = (config) =>
    Promise.reject(unauthorized(config));
  await expect(httpClient.get("/users/me")).rejects.toThrow();
  expect(storage.deleteItemAsync).not.toHaveBeenCalled();
});

test("definitively invalid refresh credentials clear the session", async () => {
  jest.spyOn(axios, "post").mockRejectedValue(
    new AxiosError("Forbidden", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 403,
      data: {},
    }),
  );
  useAuthStore.getState().setAccessToken("expired");
  httpClient.defaults.adapter = (config) =>
    Promise.reject(unauthorized(config));
  await expect(httpClient.get("/users/me")).rejects.toThrow();
  expect(storage.deleteItemAsync).toHaveBeenCalledTimes(2);
  expect(useAuthStore.getState().status).toBe("unauthenticated");
});

test("concurrent 401 requests refresh once and replay queued requests at most once", async () => {
  let completeRefresh;
  const post = jest.spyOn(axios, "post").mockImplementation(
    () =>
      new Promise((resolve) => {
        completeRefresh = resolve;
      }),
  );
  useAuthStore.getState().setAccessToken("expired");
  httpClient.defaults.adapter = (config) =>
    config.headers.Authorization === "Bearer renewed"
      ? Promise.resolve(ok(config, { ok: true }))
      : Promise.reject(unauthorized(config));
  const pending = [httpClient.get("/one"), httpClient.get("/two")];
  await new Promise((resolve) => setImmediate(resolve));
  completeRefresh({
    data: { access_token: "renewed", refresh_token: "new-refresh" },
  });
  await expect(Promise.all(pending)).resolves.toHaveLength(2);
  expect(post).toHaveBeenCalledTimes(1);
});

test("a refresh finishing after logout cannot resurrect the session", async () => {
  let completeRefresh;
  jest.spyOn(axios, "post").mockImplementation(
    () =>
      new Promise((resolve) => {
        completeRefresh = resolve;
      }),
  );
  useAuthStore.getState().setAccessToken("expired");
  httpClient.defaults.adapter = (config) =>
    Promise.reject(unauthorized(config));
  const pending = httpClient.get("/users/me");
  await new Promise((resolve) => setImmediate(resolve));
  useAuthStore.getState().clearSession();
  completeRefresh({
    data: { access_token: "renewed", refresh_token: "new-refresh" },
  });
  await expect(pending).rejects.toThrow("Session changed during refresh");
  expect(storage.setItemAsync).not.toHaveBeenCalled();
  expect(useAuthStore.getState().status).toBe("unauthenticated");
});

test("a rejected refresh from the old session does not log out a new login", async () => {
  let rejectRefresh;
  jest.spyOn(axios, "post").mockImplementation(
    () =>
      new Promise((_, reject) => {
        rejectRefresh = reject;
      }),
  );
  useAuthStore.getState().setAccessToken("expired");
  httpClient.defaults.adapter = (config) =>
    Promise.reject(unauthorized(config));
  const pending = httpClient.get("/users/me");
  await new Promise((resolve) => setImmediate(resolve));
  useAuthStore.getState().setAccessToken("new-login");
  rejectRefresh(
    new AxiosError("Forbidden", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 403,
    }),
  );
  await expect(pending).rejects.toThrow();
  expect(storage.deleteItemAsync).not.toHaveBeenCalled();
  expect(useAuthStore.getState().accessToken).toBe("new-login");
});

test("logout during token persistence also prevents refresh resurrection", async () => {
  jest
    .spyOn(axios, "post")
    .mockResolvedValue({
      data: { access_token: "renewed", refresh_token: "new-refresh" },
    });
  let completeWrite;
  storage.setItemAsync.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        completeWrite = resolve;
      }),
  );
  useAuthStore.getState().setAccessToken("expired");
  httpClient.defaults.adapter = (config) =>
    Promise.reject(unauthorized(config));
  const pending = httpClient.get("/users/me");
  await new Promise((resolve) => setImmediate(resolve));
  useAuthStore.getState().clearSession();
  completeWrite();
  await expect(pending).rejects.toThrow("Session changed during refresh");
  expect(storage.deleteItemAsync).toHaveBeenCalled();
  expect(useAuthStore.getState().status).toBe("unauthenticated");
});
