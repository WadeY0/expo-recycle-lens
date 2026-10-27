/* global jest, test, expect, beforeEach, afterEach */
jest.mock("@/config/env", () => ({
  __esModule: true,
  default: { API_URL: "http://test.invalid", API_TENANT_ID: "RECYCLELENS" },
}));
jest.mock("react-native", () => ({ Platform: { OS: "web" } }));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue("refresh-fixture"),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
const axios = require("axios").default;
const { AxiosError } = require("axios");
const { httpClient } = require("../src/shared/api/http-client");
const { useAuthStore } = require("../src/features/auth/store/auth.store");
const { registerAccessTokenGetter } = require("../src/shared/api/auth-token");
const { signOutAuth } = require("../src/features/auth/lib/auth-actions");
function ok(config, data) {
  return { data, config, status: 200, statusText: "OK", headers: {} };
}
function unauthorized(config) {
  return new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
    status: 401,
    data: {},
    config,
    headers: {},
  });
}
beforeEach(() => {
  registerAccessTokenGetter(() => useAuthStore.getState().accessToken);
  useAuthStore
    .getState()
    .setSession({ accessToken: "A-token", user: { id: "A" } });
});
afterEach(() => {
  jest.restoreAllMocks();
  useAuthStore.getState().reset();
});
async function nextSession(id = "B") {
  await signOutAuth();
  useAuthStore
    .getState()
    .setSession({ accessToken: `${id}-token-new`, user: { id } });
}
test.each(["A", "B"])(
  "a delayed 401 must never refresh/replay an old mutation after new login %s",
  async (id) => {
    let release;
    const refresh = jest.spyOn(axios, "post").mockResolvedValue({
      data: { access_token: `${id}-renewed`, refresh_token: "new-refresh" },
    });
    const calls = [];
    httpClient.defaults.adapter = (config) => {
      calls.push(config.headers.Authorization);
      if (calls.length === 1)
        return new Promise((resolve, reject) => {
          release = () => reject(unauthorized(config));
        });
      return Promise.resolve(ok(config, { owner: id }));
    };
    const old = httpClient
      .patch("/users", { fullName: "Old request" })
      .catch((error) => error);
    while (!release) await Promise.resolve();
    await nextSession(id);
    release();
    const error = await old;
    expect(error.code).toBe("SESSION_CHANGED");
    expect(refresh).not.toHaveBeenCalled();
    expect(calls).toEqual(["Bearer A-token"]);
    expect(useAuthStore.getState().accessToken).toBe(`${id}-token-new`);
  },
);
test("a delayed private success response is discarded after an identity change", async () => {
  let release;
  httpClient.defaults.adapter = (config) =>
    new Promise((resolve) => {
      release = () => resolve(ok(config, { privateHistory: "A-only" }));
    });
  const old = httpClient.get("/vision/my").catch((error) => error);
  while (!release) await Promise.resolve();
  await nextSession();
  release();
  expect((await old).code).toBe("SESSION_CHANGED");
});
test("refresh in the same session preserves the scan idempotency key and sends only one retry", async () => {
  const refresh = jest.spyOn(axios, "post").mockResolvedValue({
    data: { access_token: "A-renewed", refresh_token: "A-refresh" },
  });
  const calls = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push({
      token: config.headers.Authorization,
      key: config.headers["Idempotency-Key"],
    });
    if (calls.length === 1) throw unauthorized(config);
    return ok(config, { article: { id: "persisted" } });
  };
  await httpClient.post(
    "/vision/analyze-waste",
    {},
    { headers: { "Idempotency-Key": "stable_phase4_key" } },
  );
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(calls).toEqual([
    { token: "Bearer A-token", key: "stable_phase4_key" },
    { token: "Bearer A-renewed", key: "stable_phase4_key" },
  ]);
});
const { ApiError } = require("../src/shared/api/api-error");
const {
  createScanAttempt,
  submitScanAttempt,
  canRetryScan,
} = require("../src/features/scan/lib/scan-attempt");
const {
  getSessionAttempt,
} = require("../src/features/auth/lib/session-generation");
const image = () => ({
  uri: "fixture.png",
  file: new File(["test-image"], "fixture.png", { type: "image/png" }),
  mimeType: "image/png",
  fileSize: 10,
});
test("manual retry reuses the exact image request key after a timeout", async () => {
  const calls = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push(config.headers["Idempotency-Key"]);
    if (calls.length === 1)
      throw new AxiosError("timed out", "ECONNABORTED", config);
    return ok(config, { article: { id: "one-scan" } });
  };
  const attempt = createScanAttempt(image());
  const failure = await submitScanAttempt(attempt).catch((error) => error);
  expect(canRetryScan(failure)).toBe(true);
  expect((await submitScanAttempt(attempt)).article.id).toBe("one-scan");
  expect(calls).toEqual([attempt.key, attempt.key]);
});
test("a picker opened before logout cannot submit an image in a new session", async () => {
  const generation = getSessionAttempt();
  await nextSession();
  expect(() => createScanAttempt(image(), generation)).toThrow(
    "Phiên đăng nhập",
  );
});
test("an old scan attempt cannot be retried even when the same user logs in again", async () => {
  const adapter = jest.fn();
  httpClient.defaults.adapter = adapter;
  const attempt = createScanAttempt(image());
  await nextSession("A");
  await expect(submitScanAttempt(attempt)).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(adapter).not.toHaveBeenCalled();
});
test("invalid image is rejected before a scan attempt is created", () => {
  expect(() =>
    createScanAttempt({ uri: "photo.heic", mimeType: "image/heic" }),
  ).toThrow("HEIC");
  expect(() =>
    createScanAttempt({ uri: "photo.png", fileSize: 9 * 1024 * 1024 }),
  ).toThrow("8 MB");
});
test("retry is limited to network, timeout, rate-limit and provider/server failures", () => {
  for (const status of [0, 408, 429, 500, 503])
    expect(canRetryScan(new ApiError("fixture", status))).toBe(true);
  for (const status of [400, 401, 403, 409, 413, 422])
    expect(canRetryScan(new ApiError("fixture", status))).toBe(false);
  expect(canRetryScan(new Error("invalid input"))).toBe(false);
});
test("refresh started in an old session cannot overwrite tokens even if new login has identical access JWT", async () => {
  let release;
  const storage = require("expo-secure-store");
  storage.setItemAsync.mockClear();
  const refresh = jest.spyOn(axios, "post").mockImplementation(
    () =>
      new Promise((resolve) => {
        release = () =>
          resolve({
            data: {
              access_token: "old-refreshed",
              refresh_token: "old-refresh",
            },
          });
      }),
  );
  httpClient.defaults.adapter = async (config) => {
    throw unauthorized(config);
  };
  const request = httpClient.get("/users/me").catch((error) => error);
  while (!release) await Promise.resolve();
  await signOutAuth();
  useAuthStore
    .getState()
    .setSession({ accessToken: "A-token", user: { id: "A" } });
  release();
  expect((await request).code).toBe("SESSION_CHANGED");
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(storage.setItemAsync).not.toHaveBeenCalled();
  expect(useAuthStore.getState().accessToken).toBe("A-token");
});
const { analyzeWasteApi } = require("../src/features/scan/api/analyze-waste");
const {
  uploadAvatarApi,
} = require("../src/features/profile/api/upload-avatar");
test.each([analyzeWasteApi, uploadAvatarApi])(
  "image preparation cannot dispatch a mutation under a later account: %p",
  async (upload) => {
    let release;
    const adapter = jest.fn((config) =>
      Promise.resolve(ok(config, { article: { id: "B-scan" }, id: "B" })),
    );
    httpClient.defaults.adapter = adapter;
    jest.spyOn(global, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              blob: async () => new Blob(["image"], { type: "image/png" }),
            });
        }),
    );
    const old = upload({
      uri: "http://test.invalid/fixture.png",
      mimeType: "image/png",
    }).catch((error) => error);
    while (!release) await Promise.resolve();
    await nextSession();
    release();
    expect((await old).code).toBe("SESSION_CHANGED");
    expect(adapter).not.toHaveBeenCalled();
  },
);
test("avatar selection context from an old picker cannot upload after another login", async () => {
  const sessionAttempt = getSessionAttempt();
  await nextSession();
  const adapter = jest.fn();
  httpClient.defaults.adapter = adapter;
  await expect(
    uploadAvatarApi({ ...image(), sessionAttempt }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(adapter).not.toHaveBeenCalled();
});
