/* global jest, test, expect, beforeEach */
// Real React server renderer; native/layout/network boundaries are substituted.
// These tests verify rendered states and retry callbacks, not device interaction.
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
let mockPresses = [];
let mockQuery;
let mockHistory;
let mockDiscoveries;
jest.mock("react-native", () => {
  const React = require("react");
  const primitive = (name) =>
    function NativeBoundary(props) {
      if (props.onPress) mockPresses.push(props.onPress);
      return React.createElement(
        name,
        {
          "aria-label": props.accessibilityLabel,
          "data-disabled": props.disabled,
        },
        props.children,
      );
    };
  return {
    View: primitive("div"),
    Text: primitive("span"),
    Pressable: primitive("button"),
    ScrollView: primitive("section"),
    ActivityIndicator: primitive("i"),
    RefreshControl: () => null,
  };
});
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }) =>
    require("react").createElement("main", null, children),
}));
jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: ({ children }) =>
    require("react").createElement("svg", null, children),
  Circle: () => null,
  Ellipse: () => null,
  Path: () => null,
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));
jest.mock("@/features/gamification/lib/gamification-hooks", () => ({
  useEcoFocus: jest.fn(),
  useEcoOverview: () => mockQuery,
  useAchievements: () => mockQuery,
  useChallenges: () => mockQuery,
  useXPHistory: () => mockHistory,
  useDiscoveries: () => mockDiscoveries,
}));
const {
  EcoDashboardScreen,
} = require("../src/features/gamification/screens/EcoDashboardScreen");
const {
  AchievementsScreen,
} = require("../src/features/gamification/screens/AchievementsScreen");
const {
  ChallengesScreen,
} = require("../src/features/gamification/screens/ChallengesScreen");
const {
  EcoHistoryScreen,
} = require("../src/features/gamification/screens/EcoHistoryScreen");
const {
  VirtualPlant,
  ChallengeCard,
  AchievementCard,
} = require("../src/features/gamification/components/EcoComponents");
function state(extra = {}) {
  return {
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    data: [],
    ...extra,
  };
}
const challenge = {
  key: "daily_scan_3",
  title: "Quét 3 lần đủ điều kiện",
  target: 3,
  progress: 1,
  period: "daily",
  periodKey: "2026-10-09",
  rewardXp: 30,
  startsAt: "2026-10-08T17:00:00Z",
  endsAt: "2026-10-09T17:00:00Z",
  completedAt: null,
  rewardedAt: null,
};
const achievement = {
  key: "first_scan",
  title: "Lần quét đầu tiên",
  description: "Quét an toàn",
  progress: 0,
  target: 1,
  rewardXp: 0,
  unlocked: false,
  unlockedAt: null,
};
function render(Screen) {
  return renderToStaticMarkup(React.createElement(Screen));
}
beforeEach(() => {
  mockPresses = [];
  mockQuery = state();
  mockHistory = state({ data: { pages: [{ data: [], total: 0 }] } });
  mockDiscoveries = state({ data: { pages: [{ data: [], total: 0 }] } });
});
test.each([EcoDashboardScreen, AchievementsScreen, ChallengesScreen])(
  "renders loading state for %p",
  (Screen) => {
    mockQuery = state({ isPending: true, data: undefined });
    expect(render(Screen)).toContain("Đang tải hành trình xanh");
    expect(render(Screen)).not.toContain("NaN");
  },
);
test.each([EcoDashboardScreen, AchievementsScreen, ChallengesScreen])(
  "renders error and wires retry for %p",
  (Screen) => {
    mockQuery = state({ isError: true, data: undefined });
    expect(render(Screen)).toContain("Không tải được tiến độ");
    expect(render(Screen)).toContain("Thử lại");
    mockPresses.at(-1)();
    expect(mockQuery.refetch).toHaveBeenCalled();
  },
);
test.each([AchievementsScreen, ChallengesScreen])(
  "renders empty state for %p",
  (Screen) => expect(render(Screen)).toContain("Chưa có hoạt động"),
);
test("new user's dashboard displays backend-owned XP, plant and empty achievements", () => {
  mockQuery = state({
    data: {
      level: 1,
      totalXp: 0,
      currentLevelXp: 0,
      nextLevelXp: 100,
      progressPercent: 0,
      uniqueDiscoveries: 0,
      plant: { stage: "seed", title: "Hạt giống", level: 1 },
      policy: { scan: 7, dailyScanLimit: 4, discovery: 22 },
      recentAchievements: [],
      activeChallenges: [challenge],
    },
  });
  const markup = render(EcoDashboardScreen);
  expect(markup).toContain("0 Eco XP");
  expect(markup).toContain("Hạt giống");
  expect(markup).toContain("+7 XP");
  expect(markup).toContain("+22 XP");
  expect(markup).toContain("tối đa 4");
  expect(markup).toContain("Chưa có hoạt động");
  mockQuery.data.nextLevelXp = null;
  mockQuery.data.progressPercent = 100;
  expect(render(EcoDashboardScreen)).toContain("Đã đạt cấp tối đa");
});
test("shows locked/unlocked achievements and separately completed/rewarded challenges", () => {
  expect(
    renderToStaticMarkup(React.createElement(AchievementCard, { achievement })),
  ).toContain("Chưa mở khóa");
  expect(
    renderToStaticMarkup(
      React.createElement(AchievementCard, {
        achievement: {
          ...achievement,
          unlocked: true,
          progress: 1,
          unlockedAt: "2026-10-09T01:00:00Z",
        },
      }),
    ),
  ).toContain("Đã mở khóa");
  expect(
    renderToStaticMarkup(React.createElement(ChallengeCard, { challenge })),
  ).toContain("Đang thực hiện");
  expect(
    renderToStaticMarkup(
      React.createElement(ChallengeCard, {
        challenge: { ...challenge, completedAt: "2026-10-09T01:00:00Z" },
      }),
    ),
  ).toContain("Chờ xác nhận thưởng");
  expect(
    renderToStaticMarkup(
      React.createElement(ChallengeCard, {
        challenge: {
          ...challenge,
          completedAt: "2026-10-09T01:00:00Z",
          rewardedAt: "2026-10-09T01:00:00Z",
        },
      }),
    ),
  ).toContain("Đã hoàn tất và nhận thưởng");
});
test.each(["seed", "sprout", "young_plant", "growing_plant", "mature_plant"])(
  "renders stable plant stage %s accessibly",
  (stage) => {
    expect(
      renderToStaticMarkup(
        React.createElement(VirtualPlant, {
          plant: { stage, title: stage, level: 1 },
        }),
      ),
    ).toContain(`Cây ảo: ${stage}`);
  },
);
test("history handles independent loading, error/retry and empty resources", () => {
  expect(render(EcoHistoryScreen)).toContain("Chưa có hoạt động");
  mockHistory = state({ isPending: true, data: undefined });
  expect(render(EcoHistoryScreen)).toContain("Đang tải hành trình xanh");
  mockDiscoveries = state({ isError: true, data: undefined });
  expect(render(EcoHistoryScreen)).toContain("Không tải được tiến độ");
  mockPresses.at(-1)();
  expect(mockDiscoveries.refetch).toHaveBeenCalled();
});
test("history renders zero-XP capped scans and historical discoveries without fabricating rewards", () => {
  mockHistory.data.pages[0].data = [
    {
      id: "event",
      amount: 0,
      reason: "daily_limit",
      kind: "scan",
      occurredAt: "2026-10-09T01:00:00Z",
      scanId: "scan",
    },
  ];
  mockDiscoveries.data.pages[0].data = [
    {
      wasteSlug: "pet-bottle",
      name: "Chai nhựa PET",
      articleId: null,
      historical: true,
      discoveredAt: "2026-10-01T01:00:00Z",
    },
  ];
  const html = render(EcoHistoryScreen);
  expect(html).toContain("+0 XP");
  expect(html).toContain("Đã đạt giới hạn XP ngày");
  expect(html).toContain("Đã khám phá từ lịch sử cũ");
  expect(html).toContain('data-disabled="true"');
});
