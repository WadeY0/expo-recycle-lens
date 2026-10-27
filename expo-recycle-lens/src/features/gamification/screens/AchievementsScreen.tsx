import { RefreshControl, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAchievements, useEcoFocus } from "../lib/gamification-hooks";
import {
  AchievementCard,
  EcoFeedback,
  EcoHeader,
} from "../components/EcoComponents";
export function AchievementsScreen() {
  const query = useAchievements();
  useEcoFocus(query.refetch);
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <EcoHeader title="Thành tựu" />
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
        <Text className="text-grey-600 mb-5">
          Thành tựu được xác nhận tự động bởi hệ thống, không cộng thêm XP.
        </Text>
        <EcoFeedback
          loading={query.isPending}
          error={query.isError}
          empty={!query.data?.length}
          onRetry={() => {
            void query.refetch();
          }}
        />
        {!query.isPending &&
          !query.isError &&
          query.data?.map((achievement) => (
            <AchievementCard key={achievement.key} achievement={achievement} />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
