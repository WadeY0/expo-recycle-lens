import { useRouter } from "expo-router";
import { Heart } from "iconsax-react-nativejs";
import { Pressable, Text, View } from "react-native";

import type { User } from "@/features/auth/types/auth.types";
import type { GamificationOverview } from "@/features/gamification/types/gamification.types";

import { EcoAvatarProgress } from "@/features/gamification/components/EcoAvatarProgress";

interface HomePlayerHeaderProps {
  user: User | null;
  overview?: GamificationOverview;
  isLoading?: boolean;
  isError?: boolean;
}

export function HomePlayerHeader({
  user,
  overview,
  isLoading = false,
  isError = false,
}: HomePlayerHeaderProps) {
  const router = useRouter();

  const displayName = user?.fullName?.trim() || "Người dùng";

  const level = overview?.level ?? null;
  const totalXp = overview?.totalXp ?? null;

  const remainingXp =
    overview?.nextLevelXp == null
      ? null
      : Math.max(0, overview.nextLevelXp - overview.totalXp);

  const formatXp = (value: number) => value.toLocaleString("vi-VN");

  return (
    <View className="flex-row items-center px-5 pt-3 pb-4">
      {/* Player identity */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          overview
            ? `Xem hành trình xanh, cấp ${overview.level}, ${overview.totalXp} XP`
            : "Xem hành trình xanh"
        }
        onPress={() => router.push("/(protected)/eco-dashboard")}
        className="min-w-0 flex-1 flex-row items-center"
      >
        {/* Reusable avatar with XP ring */}
        <EcoAvatarProgress
          avatar={user?.avatar}
          level={level}
          progressPercent={overview?.progressPercent ?? null}
          size={76}
        />

        {/* Player information */}
        <View className="ml-3 min-w-0 flex-1">
          <Text className="text-xs text-grey-500">Xin chào!</Text>

          <Text
            className="mt-0.5 text-base font-bold text-grey-900"
            numberOfLines={1}
          >
            {displayName}
          </Text>

          {overview ? (
            <>
              <View className="mt-1 flex-row items-center">
                <Text
                  className="text-sm font-bold text-primary-main"
                  numberOfLines={1}
                >
                  {formatXp(totalXp ?? 0)} XP
                </Text>

                <Text className="ml-2 text-xs font-medium text-grey-600">
                  · Cấp {level}
                </Text>
              </View>

              <Text className="mt-1 text-xs text-grey-500" numberOfLines={1}>
                {remainingXp === null
                  ? "Đã đạt cấp tối đa"
                  : `Còn ${formatXp(remainingXp)} XP lên cấp ${overview.level + 1}`}
              </Text>
            </>
          ) : (
            <Text className="mt-2 text-xs text-grey-500" numberOfLines={2}>
              {isLoading
                ? "Đang tải XP..."
                : isError
                  ? "Chưa tải được tiến độ"
                  : "Khám phá hành trình xanh"}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Favorites */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mở nội dung đã lưu"
        onPress={() => router.push("/(protected)/favorites")}
        className="ml-3 h-11 w-11 items-center justify-center rounded-full border border-grey-100 bg-grey-50"
      >
        <Heart size={22} color="#161C24" variant="Linear" />
      </Pressable>
    </View>
  );
}
