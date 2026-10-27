import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChallenges, useEcoFocus } from "../lib/gamification-hooks";
import {
  ChallengeCard,
  EcoFeedback,
  EcoHeader,
} from "../components/EcoComponents";
export function ChallengesScreen() {
  const query = useChallenges();
  useEcoFocus(query.refetch);
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <EcoHeader title="Thử thách Eco" />
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
          Ngày mới bắt đầu lúc 00:00; tuần mới vào thứ Hai, theo giờ Việt Nam.
          Thưởng được ghi tự động khi hoàn tất. Chỉ quét khi có vật cần nhận
          dạng; không chạm hoặc tháo vật nguy hại.
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
          (["daily", "weekly"] as const).map((period) => (
            <View key={period}>
              <Text className="text-xl font-bold text-grey-900 mb-4">
                {period === "daily" ? "Hằng ngày" : "Hằng tuần"}
              </Text>
              {query.data
                ?.filter((row) => row.period === period)
                .map((challenge) => (
                  <ChallengeCard
                    key={`${challenge.key}:${challenge.periodKey}`}
                    challenge={challenge}
                  />
                ))}
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
