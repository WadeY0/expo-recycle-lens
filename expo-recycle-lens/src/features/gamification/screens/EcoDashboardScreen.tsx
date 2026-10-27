import { useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEcoFocus, useEcoOverview } from "../lib/gamification-hooks";
import {
  AchievementCard,
  ChallengeCard,
  EcoFeedback,
  EcoHeader,
  EcoProgress,
  VirtualPlant,
} from "../components/EcoComponents";
export function EcoDashboardScreen() {
  const router = useRouter();
  const query = useEcoOverview();
  useEcoFocus(query.refetch);
  const item = query.data;
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <EcoHeader title="Hành trình xanh" />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch();
            }}
          />
        }
      >
        <EcoFeedback
          loading={query.isPending}
          error={query.isError}
          onRetry={() => {
            void query.refetch();
          }}
        />
        {!query.isPending && !query.isError && item && (
          <>
            <View className="rounded-3xl bg-grey-50 p-6">
              <Text className="text-3xl font-bold text-primary-main">
                {item.totalXp} Eco XP
              </Text>
              <Text className="text-lg text-grey-900 mt-2">
                Cấp độ {item.level}
              </Text>
              <EcoProgress
                progress={
                  item.nextLevelXp === null
                    ? 1
                    : item.totalXp - item.currentLevelXp
                }
                target={
                  item.nextLevelXp === null
                    ? 1
                    : item.nextLevelXp - item.currentLevelXp
                }
              />
              <Text className="text-grey-600">
                {item.nextLevelXp === null
                  ? "Đã đạt cấp tối đa"
                  : `${Math.floor(item.progressPercent)}% · Còn ${item.nextLevelXp - item.totalXp} XP tới cấp tiếp theo`}
              </Text>
            </View>
            <VirtualPlant plant={item.plant} />
            <Text className="text-lg font-bold text-grey-900 mb-3">
              Đã khám phá {item.uniqueDiscoveries} loại rác
            </Text>
            <Text className="text-grey-600 leading-6 mb-5">
              Quét đủ điều kiện: +{item.policy.scan} XP, tối đa{" "}
              {item.policy.dailyScanLimit} lần thưởng mỗi ngày. Khám phá lớp rác
              mới: +{item.policy.discovery} XP. Kết quả không rõ hoặc chưa chắc
              chắn không được thưởng. XP ghi nhận học nhận dạng; luôn xác minh
              hướng dẫn và tránh tiếp xúc rác nguy hại.
            </Text>
            <View className="flex-row flex-wrap gap-3 mb-6">
              {[
                {
                  title: "Thành tựu",
                  path: "/(protected)/achievements" as const,
                },
                {
                  title: "Thử thách",
                  path: "/(protected)/challenges" as const,
                },
                {
                  title: "Lịch sử XP",
                  path: "/(protected)/eco-history" as const,
                },
              ].map((link) => (
                <Pressable
                  key={link.path}
                  accessibilityRole="button"
                  onPress={() => router.push(link.path)}
                  className="rounded-xl bg-primary-50 p-4"
                >
                  <Text className="font-bold text-primary-main">
                    {link.title}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-xl font-bold text-grey-900 mb-4">
              Thử thách đang diễn ra
            </Text>
            {item.activeChallenges.map((challenge) => (
              <ChallengeCard key={challenge.key} challenge={challenge} />
            ))}
            <Text className="text-xl font-bold text-grey-900 mt-5 mb-4">
              Thành tựu gần đây
            </Text>
            <EcoFeedback
              loading={false}
              error={false}
              empty={item.recentAchievements.length === 0}
              onRetry={() => {
                void query.refetch();
              }}
            />
            {item.recentAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.key}
                achievement={achievement}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
