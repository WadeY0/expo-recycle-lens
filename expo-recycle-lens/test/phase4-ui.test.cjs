/* global jest, test, expect, beforeEach */
// Real React renderer; native and API hooks are boundaries, not a device test.
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
jest.mock("@/config/env", () => ({
  __esModule: true,
  default: { API_URL: "http://test.invalid", API_TENANT_ID: "RECYCLELENS" },
}));
jest.mock("@/shared/api/http-client", () => ({ httpClient: {} }));
let mockPresses = [];
let mockRefresh;
let mockCategories;
let mockArticles;
let mockWaste;
let mockVision;
jest.mock("react-native", () => {
  const React = require("react");
  const primitive = (name) =>
    function NativeBoundary(props) {
      if (props.onPress) mockPresses.push(props.onPress);
      if (props.refreshControl) mockRefresh = props.refreshControl.props;
      return React.createElement(
        name,
        { "aria-label": props.accessibilityLabel },
        props.children,
      );
    };
  return {
    Dimensions: { get: () => ({ width: 360 }) },
    useWindowDimensions: () => ({ width: 360 }),
    ImageBackground: primitive("div"),
    FlatList: ({ data, renderItem }) =>
      React.createElement(
        "section",
        null,
        data.map((item) =>
          React.createElement("div", { key: item.id }, renderItem({ item })),
        ),
      ),
    View: primitive("div"),
    Text: primitive("span"),
    Pressable: primitive("button"),
    ScrollView: primitive("section"),
    ActivityIndicator: primitive("i"),
    Image: () => null,
    RefreshControl: () => null,
  };
});
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }) =>
    require("react").createElement("main", null, children),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: "saved-scan" }),
}));
jest.mock("iconsax-react-nativejs", () => ({
  Heart: () => null,
  SearchNormal1: () => null,
}));
jest.mock("@/features/auth/store/auth.store", () => ({
  useAuthStore: (selector) =>
    selector({ user: { id: "fixture", fullName: "Demo" } }),
}));
jest.mock("@/features/waste-library/lib/category-hooks", () => ({
  useCategoryOptions: jest.fn(() => mockCategories),
}));
jest.mock("@/features/articles/lib/article-hooks", () => ({
  useArticles: (query) => (query.type === "post" ? mockArticles : mockWaste),
}));
jest.mock("@/shared/utils/image-utils", () => ({ getImageUrl: (uri) => uri }));
jest.mock("@/shared/components/ui/RemoteImage", () => ({
  RemoteImage: () => null,
}));
jest.mock("@/features/articles/components/ArticleCardWithFavorite", () => ({
  ArticleCardWithFavorite: ({ item }) =>
    require("react").createElement("span", null, item.title),
}));
jest.mock("@/features/articles/components/WasteCardWithFavorite", () => ({
  WasteCardWithFavorite: ({ item }) =>
    require("react").createElement("span", null, item.title),
}));
const { HomeScreen } = require("../src/features/home/screens/HomeScreen");
const {
  HomeQueryFeedback,
} = require("../src/features/home/components/HomeScreenComponents");
const {
  useCategoryOptions,
} = require("../src/features/waste-library/lib/category-hooks");
const state = (extra) => ({
  isPending: false,
  isError: false,
  isRefetching: false,
  data: { data: [] },
  refetch: jest.fn(),
  ...extra,
});
beforeEach(() => {
  mockPresses = [];
  mockRefresh = undefined;
  mockCategories = state();
  mockArticles = state();
  mockWaste = state();
  jest.clearAllMocks();
});
test("Home requests all library category options instead of the first mixed page", () => {
  mockCategories.data.data = Array.from({ length: 15 }, (_, id) => ({
    id: String(id),
    title: `Danh mục ${id}`,
    type: "library",
  }));
  const html = renderToStaticMarkup(React.createElement(HomeScreen));
  expect(useCategoryOptions).toHaveBeenCalledWith("library");
  expect(html).toContain("Danh mục 14");
});
test("loading and API failure never masquerade as an empty waste/article library", () => {
  mockWaste.isPending = true;
  mockArticles.isError = true;
  const html = renderToStaticMarkup(React.createElement(HomeScreen));
  expect(html).toContain("Đang tải nội dung");
  expect(html).toContain("Không tải được nội dung");
  expect(html).not.toContain("Không có rác nào");
  expect(html).not.toContain("Chưa có bài viết");
});
test("content error exposes a retry callback and accessible button", () => {
  const retry = jest.fn();
  const html = renderToStaticMarkup(
    React.createElement(HomeQueryFeedback, {
      pending: false,
      error: true,
      empty: true,
      emptyText: "empty",
      retry,
    }),
  );
  expect(html).toContain('aria-label="Thử tải lại nội dung"');
  mockPresses[0]();
  expect(retry).toHaveBeenCalledTimes(1);
});
test("pull to refresh refetches every Home data source", () => {
  renderToStaticMarkup(React.createElement(HomeScreen));
  mockRefresh.onRefresh();
  for (const query of [mockCategories, mockWaste, mockArticles])
    expect(query.refetch).toHaveBeenCalledTimes(1);
});
test("successful empty results have honest empty states", () => {
  const html = renderToStaticMarkup(React.createElement(HomeScreen));
  expect(html).toContain("Không có rác nào trong danh mục này");
  expect(html).toContain("Chưa có bài viết");
});

jest.mock("@/shared/constants/images", () => ({
  __esModule: true,
  default: { ob1: 0, ob2: 0, ob3: 0 },
}));
jest.mock("@/shared/store/app.store", () => ({
  useAppStore: (selector) => selector({ completeOnboarding: jest.fn() }),
}));
jest.mock("@/shared/components/ui/AppButton", () => ({
  AppButton: ({ label }) =>
    require("react").createElement("button", null, label),
}));
const {
  OnboardingScreen,
} = require("../src/features/onboarding/screens/OnboardingScreen");
test("onboarding warns about AI uncertainty, local collection and hazardous objects", () => {
  const html = renderToStaticMarkup(React.createElement(OnboardingScreen));
  expect(html).toContain("quy định thu gom địa phương");
  expect(html).toContain("AI có thể sai");
  expect(html).toContain("Không chạm vào vật nghi nguy hại");
  expect(html).not.toContain("đúng thùng chỉ trong vài giây");
});

jest.mock("react-native-render-html", () => ({
  __esModule: true,
  default: ({ source }) =>
    require("react").createElement("article", {
      dangerouslySetInnerHTML: { __html: source.html },
    }),
}));
jest.mock("@/features/scan/lib/vision-hooks", () => ({
  useVisionDetail: () => mockVision,
}));
jest.mock("@/features/waste-library/components/GuidancePanel", () => ({
  GuidancePanel: () =>
    require("react").createElement("span", null, "Curated guidance"),
}));
const {
  ScanResultScreen,
} = require("../src/features/scan/screens/ScanResultScreen");
function scanView(extra = {}) {
  mockVision = {
    isLoading: false,
    refetch: jest.fn(),
    data: {
      id: "saved-scan",
      title: "Wrapper title",
      image: null,
      analysis: {
        schemaVersion: 1,
        status: "recognized",
        recognitionStatus: "recognized",
        label: "AI coffee container",
        content: "Two layers visible",
        material: "mixed",
        observations: null,
        potentiallyHazardous: false,
        modelReportedConfidence: null,
        reasons: ["no_exact_library_match"],
        matchedWaste: null,
        guidance: null,
        candidates: [],
        safetyAdvice: [],
        disclaimer: "AI unverified",
        ...extra,
      },
    },
  };
  return renderToStaticMarkup(React.createElement(ScanResultScreen));
}
test("Scan Result prioritizes actual AI label/findings even without a library match", () => {
  const html = scanView();
  expect(html).toContain("AI coffee container");
  expect(html).toContain("Two layers visible");
  expect(html).toContain("mixed");
  expect(html).not.toContain("Wrapper title");
  expect(html).not.toContain("AI chưa nhận dạng được");
});
test("Scan Result preserves provider HTML and displays a separate hazardous warning", () => {
  expect(
    scanView({ recognitionStatus: "uncertain", status: "uncertain" }),
  ).toContain("AI chưa chắc chắn");
  const html = scanView({
    label: "Battery",
    potentiallyHazardous: true,
    status: "hazardous",
    content: "<h3>Cảnh báo</h3><ul><li>Giữ pin nguyên vẹn</li></ul>",
    observations: "Unsafe handling instructions",
  });
  expect(html).toContain("Có khả năng nguy hại");
  expect(html).toContain("<h3>Cảnh báo</h3>");
  expect(html).toContain("<li>Giữ pin nguyên vẹn</li>");
  expect(html).not.toContain("Unsafe handling instructions");
});
test("old private AI records render useful sanitized findings, not route JSON or scripts", () => {
  mockVision = {
    isLoading: false,
    data: {
      id: "old-scan",
      title: "Legacy object",
      image: null,
      content: "<p>Stored AI description</p><script>unsafe()</script>",
      scanAnalysis: null,
    },
  };
  const html = renderToStaticMarkup(React.createElement(ScanResultScreen));
  expect(html).toContain("Legacy object");
  expect(html).toContain("Stored AI description");
  expect(html).not.toContain("unsafe");
});
