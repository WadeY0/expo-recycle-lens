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
const { httpClient } = require("../src/shared/api/http-client");
const { useAuthStore } = require("../src/features/auth/store/auth.store");
const {
  getWasteApi,
  getWasteDetailApi,
  getWasteFiltersApi,
  setWasteFavoriteApi,
} = require("../src/features/waste-library/api/waste-api");
const { analyzeWasteApi } = require("../src/features/scan/api/analyze-waste");
const {
  getVisionDetailApi,
  getVisionHistoryApi,
} = require("../src/features/scan/api/vision-history");
const {
  validateScanImage,
  buildScanForm,
  MAX_SCAN_BYTES,
} = require("../src/features/scan/lib/scan-upload");
const { registerAccessTokenGetter } = require("../src/shared/api/auth-token");
let calls;
beforeEach(() => {
  calls = [];
  registerAccessTokenGetter(() => useAuthStore.getState().accessToken);
  useAuthStore.getState().setAccessToken("fixture-access");
  httpClient.defaults.adapter = async (config) => {
    calls.push(config);
    expect(config.headers["x-tenant-id"]).toBe("RECYCLELENS");
    expect(config.headers.Authorization).toBe("Bearer fixture-access");
    return {
      data: {
        article: { id: "scan-id" },
        analysis: { modelReportedConfidence: null },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
});
afterEach(() => {
  jest.restoreAllMocks();
  useAuthStore.getState().clearSession();
});
test("canonical waste lookup/search/filter/paging uses tenant-authenticated endpoints", async () => {
  await getWasteApi({
    keyword: "chai nhựa",
    material: "plastic",
    categoryId: "category-id",
    page: 2,
    perPage: 12,
  });
  expect(calls[0].url).toBe("/waste");
  expect(calls[0].params).toEqual({
    keyword: "chai nhựa",
    material: "plastic",
    categoryId: "category-id",
    page: 2,
    perPage: 12,
  });
  await getWasteFiltersApi();
  expect(calls[1].url).toBe("/waste/filters");
  await getWasteDetailApi("pet-bottle");
  expect(calls[2].url).toBe("/waste/pet-bottle");
});
test("favorites use owner list and explicit idempotent save/delete", async () => {
  await getWasteApi({ material: "glass" }, true);
  expect(calls[0].url).toBe("/waste/favorites");
  await setWasteFavoriteApi("pet-bottle", true);
  expect(calls[1].method).toBe("put");
  await setWasteFavoriteApi("pet-bottle", false);
  expect(calls[2].method).toBe("delete");
  expect(calls[1].url).toBe("/waste/pet-bottle/favorite");
});
test("upload rejects an oversized or unsupported file before any API call", async () => {
  expect(() =>
    validateScanImage({ uri: "file:///big.jpg", fileSize: MAX_SCAN_BYTES + 1 }),
  ).toThrow("8 MB");
  await expect(
    analyzeWasteApi({ uri: "file:///photo.heic", mimeType: "image/heic" }),
  ).rejects.toThrow("HEIC");
  expect(calls).toHaveLength(0);
});
test("web gallery uploads a real Blob with image field and adequate timeout", async () => {
  const file = new File([new Uint8Array([1, 2, 3])], "scan.png", {
    type: "image/png",
  });
  const result = await analyzeWasteApi({
    uri: "blob:fixture",
    file,
    mimeType: "image/png",
    fileSize: 3,
  });
  expect(calls[0].url).toBe("/vision/analyze-waste");
  expect(calls[0].timeout).toBe(65000);
  expect(calls[0].data.get("image").type).toBe("image/png");
  expect(result.article.id).toBe("scan-id");
  expect(result.analysis.modelReportedConfidence).toBeNull();
});
test("web camera data URI fetch becomes Blob rather than a React Native URI object", async () => {
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue(
      new Response(new Blob(["fixture"], { type: "image/jpeg" })),
    );
  const form = await buildScanForm(
    { uri: "data:image/jpeg;base64,fixture", mimeType: "image/jpeg" },
    "web",
  );
  expect(form.get("image").type).toBe("image/jpeg");
});
test("web refuses empty gallery blobs", async () => {
  await expect(
    buildScanForm(
      {
        uri: "blob:empty",
        file: new File([], "empty.png", { type: "image/png" }),
      },
      "web",
    ),
  ).rejects.toThrow();
});
test("native upload keeps jpeg MIME and URI file part", async () => {
  const append = jest.fn();
  jest.spyOn(global, "FormData").mockImplementation(() => ({ append }));
  await buildScanForm({ uri: "file:///camera.jpg" }, "ios");
  expect(append).toHaveBeenCalledWith("image", {
    uri: "file:///camera.jpg",
    name: "scan.jpg",
    type: "image/jpeg",
  });
});
test("history/detail always use owner endpoints, never generic articles", async () => {
  await getVisionHistoryApi({ page: 2, perPage: 20 });
  await getVisionDetailApi("scan-id");
  expect(calls[0].url).toBe("/vision/my");
  expect(calls[0].params).toEqual({ page: 2, perPage: 20 });
  expect(calls[1].url).toBe("/vision/my/scan-id");
});

const { QueryClient } = require("@tanstack/react-query");
const {
  cacheScanResult,
  visionDetailKey,
} = require("../src/features/scan/lib/scan-result");
const {
  getSessionAttempt,
} = require("../src/features/auth/lib/session-generation");
function savedScan(owner = "owner", id = "saved-scan") {
  const analysis = {
    schemaVersion: 1,
    status: "recognized",
    recognitionStatus: "recognized",
    label: "AI coffee container",
    content: "Two layers visible",
    material: null,
    observations: null,
    potentiallyHazardous: false,
    modelReportedConfidence: null,
    reasons: ["no_exact_library_match"],
    matchedWaste: null,
    guidance: null,
    candidates: [],
    safetyAdvice: ["Verify locally"],
    disclaimer: "AI unverified",
  };
  return {
    id,
    imageUrl: "https://images.example.invalid/a.jpg",
    analysis,
    article: {
      id,
      createdById: owner,
      title: analysis.label,
      image: "https://images.example.invalid/a.jpg",
      type: "ai_scan",
      createdAt: "2026-10-12T00:00:00Z",
      scanAnalysis: { result: analysis, provider: null, model: null },
    },
  };
}
test("authenticated POST findings populate only the owner/tenant/scan cache and are immediately reusable without a request", async () => {
  const client = new QueryClient();
  useAuthStore
    .getState()
    .setSession({ accessToken: "owner-access", user: { id: "owner" } });
  const result = savedScan();
  expect(cacheScanResult(client, result, "owner", getSessionAttempt())).toBe(
    result.id,
  );
  const key = visionDetailKey("RECYCLELENS", "owner", result.id);
  expect(client.getQueryData(key).analysis.content).toBe("Two layers visible");
  const fetch = jest.fn();
  const cached = await client.fetchQuery({
    queryKey: key,
    queryFn: fetch,
    staleTime: 30000,
  });
  expect(cached.analysis.label).toBe("AI coffee container");
  expect(fetch).not.toHaveBeenCalled();
  expect(
    client.getQueryData(visionDetailKey("APP_B", "owner", result.id)),
  ).toBeUndefined();
  expect(
    client.getQueryData(visionDetailKey("RECYCLELENS", "other", result.id)),
  ).toBeUndefined();
  client.clear();
});
test("cache refuses another owner, ambiguous library IDs and results from an expired session", () => {
  const client = new QueryClient();
  useAuthStore
    .getState()
    .setSession({ accessToken: "owner-access", user: { id: "owner" } });
  const generation = getSessionAttempt();
  expect(() =>
    cacheScanResult(client, savedScan("other"), "owner", generation),
  ).toThrow("không hợp lệ");
  expect(() =>
    cacheScanResult(
      client,
      { ...savedScan(), id: "library-id" },
      "owner",
      generation,
    ),
  ).toThrow("không hợp lệ");
  useAuthStore.getState().clearSession();
  expect(() =>
    cacheScanResult(client, savedScan(), "owner", generation),
  ).toThrow("Phiên đăng nhập");
  expect(client.getQueryCache().getAll()).toHaveLength(0);
});
test("provider HTML remains intact in the immediate cache with a bounded content size", () => {
  const client = new QueryClient();
  useAuthStore
    .getState()
    .setSession({ accessToken: "owner-access", user: { id: "owner" } });
  const result = savedScan();
  result.analysis.contentFormat = "html";
  result.analysis.source = "third_party_vision";
  result.analysis.libraryMatchStatus = "not_requested";
  result.analysis.content = `<h3>Phân tích</h3><p>${"x".repeat(20000)}</p>`;
  result.article.content = result.analysis.content;
  cacheScanResult(client, result, "owner", getSessionAttempt());
  const cached = client.getQueryData(
    visionDetailKey("RECYCLELENS", "owner", result.id),
  );
  expect(cached.content).toBe(result.article.content);
  expect(cached.analysis.content).toBe(result.article.content);
  expect(cached.analysis.matchedWaste).toBeNull();
  result.analysis.content = "x".repeat(64001);
  expect(() =>
    cacheScanResult(client, result, "owner", getSessionAttempt()),
  ).toThrow("không hợp lệ");
  client.clear();
});
