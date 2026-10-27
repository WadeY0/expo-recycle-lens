import { useEffect, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import { ArrowLeft, DocumentText, Heart } from "iconsax-react-nativejs";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getImageUrl } from "@/shared/utils/image-utils";

const PRIMARY = "#159947";

interface DetailHeaderProps {
  title: string;
  onBack: () => void;
  isFavorite?: boolean;
  favoriteDisabled?: boolean;
  onToggleFavorite?: () => void;
}

export function DetailHeader({
  title,
  onBack,
  isFavorite = false,
  favoriteDisabled = false,
  onToggleFavorite,
}: DetailHeaderProps) {
  return (
    <View className="min-h-[72px] flex-row items-center border-b border-grey-100 bg-white px-5 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={onBack}
        className="h-11 w-11 items-center justify-center rounded-xl bg-grey-100"
      >
        <ArrowLeft size={22} color="#161C24" />
      </Pressable>

      <Text
        className="mx-3 flex-1 text-center text-base font-bold text-grey-900"
        numberOfLines={1}
      >
        {title}
      </Text>

      {onToggleFavorite ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? "Bỏ lưu nội dung" : "Lưu nội dung"}
          accessibilityState={{
            selected: isFavorite,
            disabled: favoriteDisabled,
          }}
          disabled={favoriteDisabled}
          onPress={onToggleFavorite}
          className="h-11 w-11 items-center justify-center rounded-xl bg-grey-100"
        >
          <Heart
            size={22}
            color={isFavorite ? "#EB5757" : "#637381"}
            variant={isFavorite ? "Bold" : "Linear"}
          />
        </Pressable>
      ) : (
        <View className="h-11 w-11" />
      )}
    </View>
  );
}

interface DetailCoverImageProps {
  uri?: string | null;
  width: number;
  height?: number;
  fallbackEmoji?: string;
  accessibilityLabel?: string;
}

export function DetailCoverImage({
  uri,
  width,
  height = 230,
  fallbackEmoji,
  accessibilityLabel,
}: DetailCoverImageProps) {
  const source = getImageUrl(uri);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [source]);

  const showImage = !!source && !imageFailed;

  return (
    <View
      style={{ width, height }}
      className="overflow-hidden rounded-2xl bg-grey-100"
    >
      {showImage ? (
        <ExpoImage
          source={{ uri: source }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
          recyclingKey={source}
          onError={() => setImageFailed(true)}
          accessibilityLabel={accessibilityLabel ?? "Ảnh minh họa nội dung"}
        />
      ) : (
        <View
          className="h-full w-full items-center justify-center bg-primary-50"
          accessibilityLabel={accessibilityLabel ?? "Không có ảnh minh họa"}
        >
          {fallbackEmoji ? (
            <Text className="text-6xl">{fallbackEmoji}</Text>
          ) : (
            <DocumentText size={48} color="#159947" variant="Linear" />
          )}
        </View>
      )}
    </View>
  );
}

export function DetailSkeleton({
  message = "Đang tải nội dung...",
}: {
  message?: string;
}) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-6 py-5">
        <View className="h-11 w-11 rounded-xl bg-grey-200" />
      </View>

      <View className="px-6">
        <View className="h-56 rounded-2xl bg-grey-200" />

        <View className="mt-6 h-6 w-24 rounded-lg bg-grey-200" />
        <View className="mt-4 h-8 w-[88%] rounded-lg bg-grey-200" />
        <View className="mt-2 h-8 w-[65%] rounded-lg bg-grey-200" />

        <View className="mt-8 h-4 w-full rounded-lg bg-grey-100" />
        <View className="mt-3 h-4 w-[94%] rounded-lg bg-grey-100" />
        <View className="mt-3 h-4 w-[80%] rounded-lg bg-grey-100" />

        <View className="mt-6 flex-row items-center">
          <ActivityIndicator size="small" color={PRIMARY} />
          <Text className="ml-3 text-sm text-grey-500">{message}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface DetailErrorStateProps {
  message?: string;
  onRetry: () => void;
  onBack: () => void;
}

export function DetailErrorState({
  message = "Không thể tải nội dung. Vui lòng thử lại.",
  onRetry,
  onBack,
}: DetailErrorStateProps) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-grey-100">
          <DocumentText size={30} color="#637381" />
        </View>

        <Text className="text-center text-lg font-bold text-grey-900">
          Chưa thể hiển thị nội dung
        </Text>

        <Text className="mt-3 text-center text-sm leading-6 text-grey-600">
          {message}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="mt-6 min-h-12 w-full items-center justify-center rounded-2xl bg-primary-main"
        >
          <Text className="font-semibold text-white">Thử lại</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          className="mt-3 min-h-12 items-center justify-center px-5"
        >
          <Text className="font-semibold text-grey-700">Quay lại</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
