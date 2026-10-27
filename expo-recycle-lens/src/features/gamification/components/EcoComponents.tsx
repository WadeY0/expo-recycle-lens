import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import type {
  Achievement,
  Challenge,
  Plant,
} from "../types/gamification.types";
import { ArrowLeft } from "iconsax-react-nativejs";

export function EcoHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-6 py-4 bg-white">
      {/* Back Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => router.back()}
        className="h-12 w-12 items-center justify-center rounded-2xl bg-grey-100"
      >
        <ArrowLeft size={24} color="#161C24" variant="Linear" />
      </Pressable>

      {/* Header Title */}
      <View className="flex-1 items-center justify-center px-3">
        <Text
          className="text-xl font-bold text-grey-900 text-center"
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* Right Spacer - Balance Header */}
      <View className="h-12 w-12" />
    </View>
  );
}

export function EcoFeedback({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  empty?: boolean;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <View className="p-8 items-center">
        <ActivityIndicator />
        <Text className="text-grey-600 mt-3">Đang tải hành trình xanh...</Text>
      </View>
    );
  if (error)
    return (
      <View className="p-6">
        <Text accessibilityRole="alert" className="text-grey-800">
          Không tải được tiến độ. Vui lòng thử lại.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="py-4"
        >
          <Text className="text-primary-main font-bold">Thử lại</Text>
        </Pressable>
      </View>
    );
  if (empty)
    return (
      <Text className="text-grey-600 py-4">
        Chưa có hoạt động. Bắt đầu bằng một lần quét rõ nét, an toàn.
      </Text>
    );
  return null;
}
export function EcoProgress({
  progress,
  target,
}: {
  progress: number;
  target: number;
}) {
  const percentage =
    target > 0 ? Math.min(100, Math.max(0, (progress / target) * 100)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: target,
        now: Math.min(progress, target),
      }}
      className="h-2 rounded-full bg-grey-200 overflow-hidden my-3"
    >
      <View
        style={{ width: `${percentage}%` }}
        className="h-2 bg-primary-main rounded-full"
      />
    </View>
  );
}
export function VirtualPlant({ plant }: { plant: Plant }) {
  const size = {
    seed: 0,
    sprout: 1,
    young_plant: 2,
    growing_plant: 3,
    mature_plant: 4,
  }[plant.stage];
  return (
    <View
      accessible
      accessibilityLabel={`Cây ảo: ${plant.title}, cấp ${plant.level}`}
      className="rounded-3xl bg-primary-50 items-center py-6 my-4"
    >
      <Svg width={170} height={150} viewBox="0 0 170 150" accessible={false}>
        <Ellipse cx={85} cy={131} rx={55} ry={10} fill="#CFDCCF" />
        <Path d="M58 108 L112 108 L104 137 L66 137 Z" fill="#B87951" />
        {size === 0 ? (
          <Ellipse cx={85} cy={104} rx={7} ry={10} fill="#705034" />
        ) : (
          <>
            <Path
              d={`M85 109 Q80 80 85 ${90 - size * 15}`}
              stroke="#159947"
              strokeWidth={5}
              fill="none"
            />
            <Ellipse
              cx={71}
              cy={89 - size * 9}
              rx={18}
              ry={9}
              fill="#54BA71"
              transform={`rotate(25 71 ${89 - size * 9})`}
            />
            <Ellipse
              cx={99}
              cy={77 - size * 9}
              rx={18}
              ry={9}
              fill="#159947"
              transform={`rotate(-25 99 ${77 - size * 9})`}
            />
            {size >= 2 && (
              <Ellipse
                cx={70}
                cy={52}
                rx={20}
                ry={11}
                fill="#159947"
                transform="rotate(25 70 52)"
              />
            )}
            {size >= 3 && (
              <Ellipse
                cx={101}
                cy={38}
                rx={22}
                ry={12}
                fill="#54BA71"
                transform="rotate(-25 101 38)"
              />
            )}
            {size === 4 && <Circle cx={85} cy={21} r={9} fill="#F6C85F" />}
          </>
        )}
      </Svg>
      <Text className="text-xl font-bold text-primary-main">{plant.title}</Text>
      <Text className="text-grey-600 mt-2">
        Cây lớn lên cùng hành trình học phân loại rác
      </Text>
    </View>
  );
}
export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  return (
    <View className="p-5 rounded-2xl bg-grey-50 mb-3 border border-grey-100">
      <Text className="font-bold text-grey-900 text-base">
        {challenge.title}
      </Text>
      <EcoProgress progress={challenge.progress} target={challenge.target} />
      <Text className="text-grey-600">
        {challenge.progress}/{challenge.target} · +{challenge.rewardXp} XP
      </Text>
      <Text className="text-primary-main mt-2">
        {challenge.rewardedAt
          ? "✓ Đã hoàn tất và nhận thưởng"
          : challenge.completedAt
            ? "Đã hoàn tất · Chờ xác nhận thưởng"
            : "Đang thực hiện"}
      </Text>
      <Text className="text-grey-500 text-xs mt-2">
        Kết thúc:{" "}
        {new Date(challenge.endsAt).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        })}{" "}
        (giờ Việt Nam)
      </Text>
    </View>
  );
}
export function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <View
      className={`p-5 rounded-2xl mb-3 border ${achievement.unlocked ? "bg-primary-50 border-primary-main" : "bg-grey-50 border-grey-100"}`}
    >
      <Text className="font-bold text-grey-900 text-base">
        {achievement.unlocked ? "🏅" : "🔒"} {achievement.title}
      </Text>
      <Text className="text-grey-600 mt-2">{achievement.description}</Text>
      <EcoProgress
        progress={achievement.progress}
        target={achievement.target}
      />
      <Text className="text-grey-600">
        {achievement.progress}/{achievement.target} ·{" "}
        {achievement.unlocked ? "Đã mở khóa" : "Chưa mở khóa"}
      </Text>
      {achievement.unlockedAt && (
        <Text className="text-grey-500 mt-2">
          {new Date(achievement.unlockedAt).toLocaleDateString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </Text>
      )}
    </View>
  );
}
