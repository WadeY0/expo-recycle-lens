/* global jest, test, expect, beforeEach, afterEach */
jest.mock("@/config/env", () => ({
  __esModule: true,
  default: { API_URL: "http://test.invalid", API_TENANT_ID: "RECYCLELENS" },
}));
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
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

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
  },
}));
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => mockClient,
    useMutation: (options) => options,
  };
});
const { QueryClient } = require("@tanstack/react-query");
let mockClient;
const { useToggleLike } = require("../src/features/articles/lib/article-hooks");
const nativeGoogle = require("@react-native-google-signin/google-signin");
const {
  handleGoogleSignIn,
} = require("../src/features/auth/lib/google-signin-helper");
const { Buffer } = require("node:buffer");
const axios = require("axios").default;
const { AxiosError } = require("axios");
const storage = require("expo-secure-store");
const { Platform } = require("react-native");
const { router } = require("expo-router");
const { httpClient } = require("../src/shared/api/http-client");
const { useAuthStore } = require("../src/features/auth/store/auth.store");
const { registerAccessTokenGetter } = require("../src/shared/api/auth-token");
const {
  signInAuth,
  googleAuth,
  signOutAuth,
  hydrateAuth,
  resetPasswordAuth,
} = require("../src/features/auth/lib/auth-actions");
const {
  sanitizeArticleHtml,
  safeContentUrl,
  articleShareMessage,
} = require("../src/features/articles/lib/safe-content");
const {
  setArticleFavoriteApi,
} = require("../src/features/articles/api/set-favorite");
const { getArticlesApi } = require("../src/features/articles/api/get-articles");
const {
  getLikedArticlesApi,
} = require("../src/features/articles/api/get-liked-articles");
const {
  applyProfileResponse,
} = require("../src/features/profile/lib/profile-session");
const {
  updateUserApi,
  uploadAvatarApi,
} = require("../src/features/profile/api/profile-api");
const {
  changePasswordApi,
} = require("../src/features/profile/api/change-password");
const webSession = require("../src/features/auth/lib/auth-session.web");
const {
  profileSchema,
  changePasswordSchema,
} = require("../src/features/profile/lib/profile-validation");
const {
  signUpSchema,
  signInSchema,
  resetPasswordSchema,
} = require("../src/features/auth/validator/auth.schema");
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
  jest.clearAllMocks();
  useAuthStore.getState().reset();
  registerAccessTokenGetter(() => useAuthStore.getState().accessToken);
  storage.getItemAsync.mockResolvedValue("stored-refresh");
  Platform.OS = "android";
});
afterEach(() => {
  jest.restoreAllMocks();
  mockClient?.clear();
  delete global.window;
  delete process.env.EXPO_PUBLIC_KEY_GOOGLE_WEB;
  delete process.env.EXPO_PUBLIC_KEY_GOOGLE_IOS;
});

test("article HTML keeps formatting but removes active content and all unwanted attributes", () => {
  const html = sanitizeArticleHtml(
    '<p style="background:url(javascript:x)" onclick="bad()">Môi trường <strong>an toàn</strong></p><script>alert(1)</script><iframe src="https://evil"></iframe><img src="https://track" onerror="bad()"><svg><a href="javascript:bad">bad</a></svg>',
  );
  expect(html).toBe("<p>Môi trường <strong>an toàn</strong></p>");
});
test.each([
  "javascript:alert(1)",
  "data:text/html,bad",
  "//evil.test",
  "https://user:pass@example.com",
  "https://",
])("blocks unsafe content URL %s", (url) => {
  expect(safeContentUrl(url)).toBeNull();
});
test("decoded HTML entities cannot smuggle javascript links; escaped text stays text", () => {
  const html = sanitizeArticleHtml(
    '<a href="javascript&#58;alert(1)" target="evil">x</a><p>&lt;script&gt;visible&lt;/script&gt;</p><a href="https://example.org/info?a=1&amp;b=2" onclick="bad()">Nguồn</a>',
  );
  expect(html).toBe(
    '<a>x</a><p>&lt;script&gt;visible&lt;/script&gt;</p><a href="https://example.org/info?a=1&amp;b=2">Nguồn</a>',
  );
});
test("native share gets authored plain text rather than markup or a fabricated public URL", () => {
  expect(
    articleShareMessage({
      title: "Tái chế",
      content: "<p>Giảm rác &amp; tái dùng</p><script>bad</script>",
    }),
  ).toBe("Tái chế\n\nGiảm rác & tái dùng\n\nChia sẻ từ RecycleLens");
});
test("article APIs send server pagination/search/sort and idempotent favorites", async () => {
  const seen = [];
  httpClient.defaults.adapter = (config) => {
    seen.push(config);
    return Promise.resolve(
      ok(config, { data: [], isLiked: true, likeCount: 1 }),
    );
  };
  const params = {
    type: "post",
    categoryId: "category",
    keyword: "rác",
    page: 2,
    perPage: 12,
    sortBy: "title_asc",
  };
  await getArticlesApi(params);
  await getLikedArticlesApi(params);
  await setArticleFavoriteApi("id", true);
  await setArticleFavoriteApi("id", false);
  expect(seen[0].params).toEqual(params);
  expect(seen[1].url).toBe("/articles/liked");
  expect(seen.slice(2).map((x) => [x.method, x.url])).toEqual([
    ["put", "/articles/id/favorite"],
    ["delete", "/articles/id/favorite"],
  ]);
  expect(seen.every((x) => x.headers["x-tenant-id"] === "RECYCLELENS")).toBe(
    true,
  );
});
test.each(["password", "google"])(
  "login %s keeps the token renewed while fetching profile",
  async (method) => {
    jest.spyOn(axios, "post").mockResolvedValue({
      data: { access_token: "renewed", refresh_token: "new-refresh" },
    });
    httpClient.defaults.adapter = (config) => {
      if (config.url.startsWith("/auth/"))
        return Promise.resolve(
          ok(config, {
            access_token: "expired",
            refresh_token: "first-refresh",
          }),
        );
      return config.headers.Authorization === "Bearer renewed"
        ? Promise.resolve(ok(config, { id: "user", isVerified: true }))
        : Promise.reject(unauthorized(config));
    };
    await (method === "google"
      ? googleAuth({ access_token: "google-id-token" })
      : signInAuth({ email: "u@example.invalid", password: "pass" }));
    expect(useAuthStore.getState().accessToken).toBe("renewed");
    expect(useAuthStore.getState().status).toBe("authenticated");
  },
);
test("unverified login navigates with real userId and email without persisting missing tokens", async () => {
  httpClient.defaults.adapter = (config) =>
    Promise.resolve(ok(config, { requiresVerification: true, userId: "id" }));
  await signInAuth({ email: "u@example.invalid", password: "pass" });
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/(public)/verify-email",
    params: { userId: "id", email: "u@example.invalid" },
  });
  expect(storage.setItemAsync).not.toHaveBeenCalled();
});
test("login result finishing after logout cannot restore tokens or identity", async () => {
  let complete;
  httpClient.defaults.adapter = (config) =>
    new Promise((resolve) => {
      complete = () =>
        resolve(
          ok(config, { access_token: "late", refresh_token: "late-refresh" }),
        );
    });
  const pending = signInAuth({ email: "u@example.invalid", password: "pass" });
  await new Promise((resolve) => setImmediate(resolve));
  await signOutAuth();
  complete();
  await expect(pending).rejects.toThrow("Phiên đăng nhập đã thay đổi");
  expect(storage.setItemAsync).not.toHaveBeenCalled();
  expect(useAuthStore.getState().accessToken).toBeNull();
});
test("a failed old login does not clear a newer successful session", async () => {
  let rejectOld;
  httpClient.defaults.adapter = (config) =>
    config.url === "/auth/sign-in" &&
    JSON.parse(config.data).email === "old@example.invalid"
      ? new Promise((_, reject) => {
          rejectOld = () => reject(unauthorized(config));
        })
      : Promise.resolve(
          ok(
            config,
            config.url === "/users/me"
              ? { id: "new-user" }
              : { access_token: "new-login", refresh_token: "new-refresh" },
          ),
        );
  const old = signInAuth({ email: "old@example.invalid", password: "pass" });
  await new Promise((resolve) => setImmediate(resolve));
  await signInAuth({ email: "new@example.invalid", password: "pass" });
  rejectOld();
  await expect(old).rejects.toThrow();
  expect(useAuthStore.getState().user.id).toBe("new-user");
  expect(storage.deleteItemAsync).not.toHaveBeenCalled();
});
test("hydration waiting for storage cannot restore a session after logout", async () => {
  let completeRead;
  storage.getItemAsync.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        completeRead = resolve;
      }),
  );
  const pending = hydrateAuth();
  await new Promise((resolve) => setImmediate(resolve));
  const out = signOutAuth();
  completeRead("old-token");
  await Promise.all([out, pending]);
  expect(useAuthStore.getState().accessToken).toBeNull();
});
test("profile response uses current token after refresh and ignores another owner or logout", () => {
  useAuthStore
    .getState()
    .setSession({ accessToken: "renewed", user: { id: "owner" } });
  expect(applyProfileResponse({ id: "other", fullName: "Bad" })).toBe(false);
  expect(
    applyProfileResponse({ id: "owner", fullName: "Updated", avatar: null }),
  ).toBe(true);
  expect(useAuthStore.getState().accessToken).toBe("renewed");
  expect(useAuthStore.getState().user.avatar).toBeNull();
  useAuthStore.getState().clearSession();
  expect(applyProfileResponse({ id: "owner" })).toBe(false);
});
test("profile, change-password and reset APIs use canonical payloads", async () => {
  const seen = [];
  httpClient.defaults.adapter = (config) => {
    seen.push(config);
    return Promise.resolve(ok(config, { id: "owner" }));
  };
  await updateUserApi({ fullName: "Tên", age: null });
  await changePasswordApi({ oldPassword: "old", newPassword: "new-password" });
  await resetPasswordAuth({
    userId: "id",
    otpCode: "123456",
    password: "new-password",
    confirmPassword: "new-password",
  });
  expect(seen.map((x) => x.url)).toEqual([
    "/users",
    "/users/change-password",
    "/auth/reset-password",
  ]);
  expect(JSON.parse(seen[0].data)).toEqual({ fullName: "Tên", age: null });
  expect(JSON.parse(seen[2].data).userId).toBe("id");
});
test("web avatar uses a real Blob with the backend file field and no forced multipart boundary", async () => {
  Platform.OS = "web";
  let sent;
  httpClient.defaults.adapter = (config) => {
    sent = config;
    return Promise.resolve(
      ok(config, { id: "owner", avatar: "https://avatar.example/image" }),
    );
  };
  const file = new File([Buffer.from("image")], "avatar.png", {
    type: "image/png",
  });
  const result = await uploadAvatarApi({ uri: "blob:local", file });
  expect(sent.data.get("file").type).toBe("image/png");
  expect(sent.data.get("image")).toBeNull();
  expect(sent.headers["Content-Type"]).not.toBe("multipart/form-data");
  expect(result.id).toBe("owner");
});
test("avatar fails early for invalid picker metadata without making an API request", async () => {
  const adapter = jest.fn();
  httpClient.defaults.adapter = adapter;
  await expect(
    uploadAvatarApi({ uri: "file:///a.heic", mimeType: "image/heic" }),
  ).rejects.toThrow();
  await expect(
    uploadAvatarApi({ uri: "file:///a.jpg", fileSize: 8 * 1024 * 1024 + 1 }),
  ).rejects.toThrow();
  expect(adapter).not.toHaveBeenCalled();
});
test("web persistence is tenant-scoped and tab-only; SSR reads no browser storage", async () => {
  expect(await webSession.readPersistedAccessToken()).toBeNull();
  const map = new Map();
  global.window = {
    sessionStorage: {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => map.set(key, value),
      removeItem: (key) => map.delete(key),
    },
  };
  await webSession.writePersistedAccessToken("access");
  await webSession.writePersistedRefreshToken("refresh");
  expect([...map.keys()].every((key) => key.startsWith("RECYCLELENS:"))).toBe(
    true,
  );
  expect(await webSession.readPersistedRefreshToken()).toBe("refresh");
  await webSession.clearPersistedSession();
  expect(map.size).toBe(0);
});
test("forms match backend name/age/password/reset validation while retaining legacy password login", () => {
  const signup = {
    fullName: "Tên",
    email: "u@example.invalid",
    password: "password-123",
    confirmPassword: "password-123",
  };
  expect(signUpSchema.safeParse(signup).success).toBe(true);
  expect(signUpSchema.safeParse({ ...signup, age: 1.5 }).success).toBe(false);
  expect(signUpSchema.safeParse({ ...signup, password: "short" }).success).toBe(
    false,
  );
  expect(profileSchema.safeParse({ fullName: " ", age: null }).success).toBe(
    false,
  );
  expect(
    profileSchema.safeParse({ fullName: " Tên ", age: null }).data.fullName,
  ).toBe("Tên");
  expect(
    signInSchema.safeParse({ email: "u@example.invalid", password: "legacy" })
      .success,
  ).toBe(true);
  expect(
    resetPasswordSchema.safeParse({
      userId: "",
      otpCode: "123456",
      password: "password-123",
      confirmPassword: "password-123",
    }).success,
  ).toBe(false);
  expect(
    changePasswordSchema.safeParse({
      oldPassword: "old",
      newPassword: "password-123",
      confirmPassword: "mismatch",
    }).success,
  ).toBe(false);
});

test("favorite mutation invalidates flat/infinite article and waste caches together", async () => {
  mockClient = new QueryClient();
  const keys = [
    ["article", "tenant", "user", "id"],
    ["articles", "tenant", "user", "pages"],
    ["articles", "tenant", "user", "liked"],
    ["waste", "tenant", "user", true],
  ];
  for (const key of keys) mockClient.setQueryData(key, { arbitrary: "cached" });
  const mutation = useToggleLike("id", true);
  let method;
  httpClient.defaults.adapter = (config) => {
    method = config.method;
    return Promise.resolve(ok(config, { isLiked: false }));
  };
  await mutation.mutationFn();
  await mutation.onSettled();
  expect(method).toBe("delete");
  expect(keys.every((key) => mockClient.getQueryState(key).isInvalidated)).toBe(
    true,
  );
});
test("Google helper reports missing configuration without calling native signIn or server", async () => {
  delete process.env.EXPO_PUBLIC_KEY_GOOGLE_WEB;
  const adapter = jest.fn();
  httpClient.defaults.adapter = adapter;
  await handleGoogleSignIn();
  expect(nativeGoogle.GoogleSignin.signIn).not.toHaveBeenCalled();
  expect(adapter).not.toHaveBeenCalled();
});
test("Google helper sends an actual native ID token to the existing server contract", async () => {
  process.env.EXPO_PUBLIC_KEY_GOOGLE_WEB = "fixture-client";
  nativeGoogle.GoogleSignin.signIn.mockResolvedValueOnce({
    type: "success",
    data: { idToken: "fixture-id-token" },
  });
  const seen = [];
  httpClient.defaults.adapter = (config) => {
    seen.push(config);
    return Promise.resolve(
      ok(
        config,
        config.url === "/users/me"
          ? { id: "google-owner" }
          : { access_token: "access", refresh_token: "refresh" },
      ),
    );
  };
  await handleGoogleSignIn();
  expect(nativeGoogle.GoogleSignin.configure).toHaveBeenCalledWith(
    expect.objectContaining({
      webClientId: "fixture-client",
      offlineAccess: false,
    }),
  );
  expect(seen[0].url).toBe("/auth/google/token");
  expect(JSON.parse(seen[0].data)).toEqual({
    access_token: "fixture-id-token",
  });
  expect(useAuthStore.getState().user.id).toBe("google-owner");
});
test("web onboarding storage tolerates unavailable browser storage and never handles tokens", async () => {
  const { appStorage } = require("../src/shared/store/app-storage.web");
  expect(await appStorage.getItem("app-storage")).toBeNull();
  global.window = {
    get localStorage() {
      throw new Error("Browser blocked storage");
    },
  };
  expect(await appStorage.getItem("app-storage")).toBeNull();
  expect(() =>
    appStorage.setItem("app-storage", '{"hasOnboarded":true}'),
  ).not.toThrow();
});

test("a request starting after logout cannot refresh from credentials still being deleted", async () => {
  const refresh = jest.spyOn(axios, "post");
  useAuthStore.getState().clearSession();
  httpClient.defaults.adapter = (config) =>
    Promise.reject(unauthorized(config));
  await expect(httpClient.get("/users/me")).rejects.toThrow();
  expect(refresh).not.toHaveBeenCalled();
});
test("slow logout storage deletion cannot overwrite the identity of a new login", async () => {
  let completeDelete;
  storage.deleteItemAsync.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        completeDelete = resolve;
      }),
  );
  const out = signOutAuth();
  await new Promise((resolve) => setImmediate(resolve));
  httpClient.defaults.adapter = (config) =>
    Promise.resolve(
      ok(
        config,
        config.url === "/users/me"
          ? { id: "new-owner" }
          : { access_token: "new-login", refresh_token: "new-refresh" },
      ),
    );
  const login = signInAuth({ email: "new@example.invalid", password: "pass" });
  await new Promise((resolve) => setImmediate(resolve));
  completeDelete();
  await Promise.all([out, login]);
  expect(useAuthStore.getState().user.id).toBe("new-owner");
  expect(useAuthStore.getState().accessToken).toBe("new-login");
});
test("storage operation queue orders old token writes before new login writes", async () => {
  const {
    sessionStorageOperation,
  } = require("../src/features/auth/lib/session-storage-operation");
  const order = [];
  let finishOld;
  const old = sessionStorageOperation(
    () =>
      new Promise((resolve) => {
        finishOld = () => {
          order.push("old");
          resolve();
        };
      }),
  );
  const latest = sessionStorageOperation(async () => {
    order.push("new");
  });
  await new Promise((resolve) => setImmediate(resolve));
  expect(order).toEqual([]);
  finishOld();
  await Promise.all([old, latest]);
  expect(order).toEqual(["old", "new"]);
});

test("a native Google prompt finishing after logout cannot begin a new app session", async () => {
  process.env.EXPO_PUBLIC_KEY_GOOGLE_WEB = "fixture-client";
  let finishPrompt;
  nativeGoogle.GoogleSignin.signIn.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishPrompt = resolve;
      }),
  );
  const adapter = jest.fn();
  httpClient.defaults.adapter = adapter;
  const prompt = handleGoogleSignIn();
  await new Promise((resolve) => setImmediate(resolve));
  await signOutAuth();
  finishPrompt({ type: "success", data: { idToken: "late-google-id-token" } });
  await prompt;
  expect(adapter).not.toHaveBeenCalled();
  expect(useAuthStore.getState().accessToken).toBeNull();
});
