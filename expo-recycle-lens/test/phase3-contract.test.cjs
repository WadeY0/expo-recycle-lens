/* global jest, test, expect, beforeEach, afterEach */
jest.mock("@/config/env", () => ({
  __esModule: true,
  default: { API_URL: "http://test.invalid", API_TENANT_ID: "RECYCLELENS" },
}));
jest.mock("react-native", () => ({ Platform: { OS: "web" } }));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock("expo-router", () => ({ useFocusEffect: jest.fn() }));
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: (options) => options,
  useInfiniteQuery: (options) => options,
}));
jest.mock("@/features/auth/store/auth.store", () => {
  const actual = jest.requireActual("@/features/auth/store/auth.store");
  const ownerStore = (selector) => selector(actual.useAuthStore.getState());
  ownerStore.getState = actual.useAuthStore.getState;
  return { ...actual, useAuthStore: ownerStore };
});
const { QueryClient } = require("@tanstack/react-query");
const { httpClient } = require("../src/shared/api/http-client");
const { useAuthStore } = require("../src/features/auth/store/auth.store");
const { registerAccessTokenGetter } = require("../src/shared/api/auth-token");
const api = require("../src/features/gamification/api/gamification-api");
const hooks = require("../src/features/gamification/lib/gamification-hooks");
const { analyzeWasteApi } = require("../src/features/scan/api/analyze-waste");
let calls;
beforeEach(() => {
  calls = [];
  registerAccessTokenGetter(() => useAuthStore.getState().accessToken);
  useAuthStore
    .getState()
    .setSession({ accessToken: "phase3-token", user: { id: "owner" } });
  httpClient.defaults.adapter = async (config) => {
    calls.push(config);
    expect(config.headers["x-tenant-id"]).toBe("RECYCLELENS");
    expect(config.headers.Authorization).toBe("Bearer phase3-token");
    return {
      data: { totalXp: 25, level: 1, article: { id: "same-scan" } },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
});
afterEach(() => {
  useAuthStore.getState().reset();
  jest.restoreAllMocks();
});
test("all gamification endpoints are tenant-authenticated read-only requests with no client XP/userId", async () => {
  const overview = await api.getGamificationOverview();
  await api.getAchievements();
  await api.getChallenges();
  await api.getChallenge("daily_scan_3");
  await api.getPlant();
  await api.getXPHistory(2, 20);
  await api.getDiscoveries(3, 12);
  expect(overview.totalXp).toBe(25);
  expect(calls.map((c) => c.url)).toEqual([
    "/gamification/overview",
    "/gamification/achievements",
    "/gamification/challenges",
    "/gamification/challenges/daily_scan_3",
    "/gamification/plant",
    "/gamification/xp-history",
    "/gamification/discoveries",
  ]);
  expect(calls.every((c) => c.method === "get" && !c.data)).toBe(true);
  expect(calls[5].params).toEqual({ page: 2, perPage: 20 });
  expect(calls[6].params).toEqual({ page: 3, perPage: 12 });
});
test("challenge keys are URL-encoded, never path injection", async () => {
  await api.getChallenge("a/b?x=1");
  expect(calls[0].url).toBe("/gamification/challenges/a%2Fb%3Fx%3D1");
});
test("query keys partition all user progress by tenant and authenticated identity", () => {
  const prefix = ["gamification", "RECYCLELENS", "owner"];
  const options = [
    hooks.useEcoOverview(),
    hooks.useAchievements(),
    hooks.useChallenges(),
    hooks.useXPHistory(),
    hooks.useDiscoveries(),
  ];
  options.forEach((opt) => {
    expect(opt.queryKey.slice(0, 3)).toEqual(prefix);
    expect(opt.enabled).toBe(true);
  });
  expect(hooks.gamificationKey("OTHER", "owner", "overview")).not.toEqual(
    options[0].queryKey,
  );
  useAuthStore.getState().clearSession();
  expect(hooks.useEcoOverview().enabled).toBe(false);
});
test("history/discoveries advance only within server-provided safe pagination", async () => {
  for (const options of [hooks.useXPHistory(), hooks.useDiscoveries()]) {
    expect(options.initialPageParam).toBe(1);
    expect(options.getNextPageParam({ page: 1, totalPages: 2 })).toBe(2);
    expect(
      options.getNextPageParam({ page: 2, totalPages: 2 }),
    ).toBeUndefined();
    await options.queryFn({ pageParam: 2 });
    expect(calls.at(-1).params).toEqual({ page: 2, perPage: 20 });
  }
});
test("successful scan invalidation marks every progress view stale without changing XP locally", async () => {
  const client = new QueryClient();
  const key = hooks.gamificationKey("RECYCLELENS", "owner", "overview");
  client.setQueryData(key, { totalXp: 25 });
  client.setQueryData(["articles"], { data: [] });
  await hooks.invalidateGamification(client);
  expect(client.getQueryState(key).isInvalidated).toBe(true);
  expect(client.getQueryData(key).totalXp).toBe(25);
  expect(client.getQueryState(["articles"]).isInvalidated).toBe(false);
  client.clear();
});
test("scan requests preserve an explicit idempotency key for retries and generate one by default", async () => {
  const image = {
    uri: "blob:test",
    file: new File(["bytes"], "scan.png", { type: "image/png" }),
    mimeType: "image/png",
  };
  await analyzeWasteApi(image, "scan_stable_retry_key");
  await analyzeWasteApi(image, "scan_stable_retry_key");
  await analyzeWasteApi(image);
  expect(calls[0].headers["Idempotency-Key"]).toBe("scan_stable_retry_key");
  expect(calls[1].headers["Idempotency-Key"]).toBe("scan_stable_retry_key");
  expect(calls[2].headers["Idempotency-Key"]).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  expect(calls[0].data.get("image")).toBeTruthy();
  expect(calls[0].data.has("xp")).toBe(false);
});
