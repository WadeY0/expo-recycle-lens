import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import {
  DetailCoverImage,
  DetailErrorState,
  DetailHeader,
  DetailSkeleton,
} from "@/shared/components/content/DetailUI";
import { SafeHtmlContent } from "@/shared/components/content/SafeHtmlContent";

import {
  useArticleDetail,
  useToggleLike,
} from "@/features/articles/lib/article-hooks";

import { GuidancePanel } from "../components/GuidancePanel";
import { useWasteFavorite } from "../lib/waste-hooks";

function formatDate(value?: string): string | null {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("vi-VN");
}

export function WasteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const { data: item, isPending, error, refetch } = useArticleDetail(id || "");

  const favorite = useWasteFavorite();

  const { mutate: toggleLike, isPending: isTogglingLike } = useToggleLike(
    id || "",
    item?.isLiked ?? false
  );

  const goBack = () => router.back();

  if (isPending && !item) {
    return <DetailSkeleton message="Đang tải thông tin rác..." />;
  }

  if (!item) {
    return (
      <DetailErrorState
        message="Không tìm thấy loại rác hoặc không thể tải thông tin."
        onRetry={() => {
          void refetch();
        }}
        onBack={goBack}
      />
    );
  }

  const isCanonical = !!item.wasteItem;
  const contentWidth = Math.max(width - 48, 1);
  const dateLabel = formatDate(item.createdAt);

  const toggleFavorite = () => {
    if (isCanonical) {
      favorite.mutate(
        {
          id: item.id,
          saved: !item.isLiked,
        },
        {
          onError: () => {
            Toast.show({
              type: "error",
              text1: "Không thể cập nhật mục đã lưu",
            });
          },
        }
      );

      return;
    }

    // Legacy Article fallback:
    // Giữ tương thích với link cũ.
    toggleLike(undefined, {
      onError: () => {
        Toast.show({
          type: "error",
          text1: "Không thể cập nhật mục đã lưu",
        });
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <DetailHeader
        title={isCanonical ? "Thông tin phân loại" : "Kiến thức"}
        onBack={goBack}
        isFavorite={item.isLiked}
        favoriteDisabled={favorite.isPending || isTogglingLike}
        onToggleFavorite={toggleFavorite}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 110,
        }}
      >
        <View className="px-6 pt-5">
          <DetailCoverImage
            uri={item.image}
            width={contentWidth}
            height={Math.min(250, Math.max(190, width * 0.55))}
            fallbackEmoji={item.wasteItem?.guidance.illustration.emoji}
            accessibilityLabel={`Ảnh minh họa: ${item.title}`}
          />

          {item.category?.title && (
            <View className="mt-6 self-start rounded-full bg-primary-50 px-3 py-1.5">
              <Text className="text-xs font-semibold text-primary-main">
                {item.category.title}
              </Text>
            </View>
          )}

          <Text className="mt-4 text-2xl font-bold leading-9 text-grey-900">
            {item.title}
          </Text>

          {dateLabel && (
            <Text className="mt-3 text-xs text-grey-500">
              Ngày đăng: {dateLabel}
            </Text>
          )}

          {error && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void refetch();
              }}
              className="mt-4 rounded-xl bg-grey-50 p-3"
            >
              <Text className="text-sm text-red-600">
                Chưa cập nhật được thông tin. Chạm để thử lại.
              </Text>
            </Pressable>
          )}

          <View className="mt-6 border-t border-grey-100 pt-5">
            {isCanonical && item.wasteItem ? (
              <GuidancePanel guidance={item.wasteItem.guidance} />
            ) : (
              <SafeHtmlContent
                html={item.content ?? ""}
                contentWidth={contentWidth}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
