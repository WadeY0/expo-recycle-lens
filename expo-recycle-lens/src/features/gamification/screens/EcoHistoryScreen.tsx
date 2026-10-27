import { useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useDiscoveries,
  useEcoFocus,
  useXPHistory,
} from "../lib/gamification-hooks";
import { EcoFeedback, EcoHeader } from "../components/EcoComponents";
const REASONS: Record<string, string> = {
  eligible_scan: "Quét đủ điều kiện",
  daily_limit: "Quét đủ điều kiện · Đã đạt giới hạn XP ngày",
  first_discovery: "Khám phá loại rác mới",
  daily_scan_3: "Hoàn tất thử thách quét 3 lần",
  daily_scan_5: "Hoàn tất thử thách quét 5 lần",
  weekly_days_3: "Hoàn tất thử thách 3 ngày quét",
  weekly_daily_5: "Hoàn tất 5 thử thách hằng ngày",
};
export function EcoHistoryScreen() {
  const router = useRouter();
  const xp = useXPHistory();
  const discoveries = useDiscoveries();
  useEcoFocus(xp.refetch);
  useEcoFocus(discoveries.refetch);
  const entries = xp.data?.pages.flatMap((page) => page.data) ?? [];
  const items = discoveries.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <EcoHeader title="Tiến độ & lịch sử XP" />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={xp.isRefetching || discoveries.isRefetching}
            onRefresh={() => {
              void xp.refetch();
              void discoveries.refetch();
            }}
          />
        }
      >
        <Text className="text-xl font-bold text-grey-900 mb-4">
          Giao dịch XP
        </Text>
        <EcoFeedback
          loading={xp.isPending}
          error={xp.isError}
          empty={entries.length === 0}
          onRetry={() => {
            void xp.refetch();
          }}
        />
        {!xp.isPending &&
          !xp.isError &&
          entries.map((entry) => (
            <View key={entry.id} className="p-4 bg-grey-50 rounded-2xl mb-3">
              <Text className="text-primary-main font-bold">
                +{entry.amount} XP · {REASONS[entry.reason] ?? "Hoạt động xanh"}
              </Text>
              <Text className="text-grey-500 mt-2">
                {new Date(entry.occurredAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </Text>
              {entry.scanId && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/(protected)/scan-result/[id]",
                      params: { id: entry.scanId! },
                    })
                  }
                >
                  <Text className="text-primary-main mt-3">
                    Xem kết quả quét
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        {xp.hasNextPage && !xp.isError && (
          <Pressable
            accessibilityRole="button"
            disabled={xp.isFetchingNextPage}
            onPress={() => {
              void xp.fetchNextPage();
            }}
            className="py-4"
          >
            <Text className="text-primary-main">
              {xp.isFetchingNextPage ? "Đang tải..." : "Xem thêm giao dịch"}
            </Text>
          </Pressable>
        )}
        <Text className="text-xl font-bold text-grey-900 my-4">
          Khám phá thư viện ({discoveries.data?.pages[0]?.total ?? 0})
        </Text>
        <Text className="text-grey-600 mb-4">
          Lịch sử trước Phase 3 được giữ lại, không thưởng XP hồi tố.
        </Text>
        <EcoFeedback
          loading={discoveries.isPending}
          error={discoveries.isError}
          empty={items.length === 0}
          onRetry={() => {
            void discoveries.refetch();
          }}
        />
        {!discoveries.isPending &&
          !discoveries.isError &&
          items.map((item) => (
            <Pressable
              key={item.wasteSlug}
              accessibilityRole="button"
              disabled={!item.articleId}
              onPress={() => {
                if (item.articleId)
                  router.push({
                    pathname: "/(protected)/waste-details/[id]",
                    params: { id: item.articleId },
                  });
              }}
              className="p-4 bg-primary-50 rounded-2xl mb-3"
            >
              <Text className="text-grey-900 font-bold">{item.name}</Text>
              <Text className="text-grey-600 mt-2">
                {item.historical ? "Đã khám phá từ lịch sử cũ" : "Khám phá mới"}{" "}
                ·{" "}
                {new Date(item.discoveredAt).toLocaleDateString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </Text>
            </Pressable>
          ))}
        {discoveries.hasNextPage && !discoveries.isError && (
          <Pressable
            accessibilityRole="button"
            disabled={discoveries.isFetchingNextPage}
            onPress={() => {
              void discoveries.fetchNextPage();
            }}
            className="py-4"
          >
            <Text className="text-primary-main">
              {discoveries.isFetchingNextPage
                ? "Đang tải..."
                : "Xem thêm khám phá"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
