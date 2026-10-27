import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Share,
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

import { articleShareMessage } from "../lib/safe-content";
import { useArticleDetail, useToggleLike } from "../lib/article-hooks";

function formatDate(value?: string): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("vi-VN");
}

export function ArticleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const {
    data: article,
    isPending,
    error,
    refetch,
  } = useArticleDetail(id || "");

  const { mutate: toggleLike, isPending: isTogglingLike } = useToggleLike(
    id || "",
    article?.isLiked ?? false
  );

  const contentWidth = Math.max(width - 48, 1);

  const goBack = () => router.back();

  if (isPending && !article) {
    return <DetailSkeleton message="Đang tải bài viết..." />;
  }

  if (!article) {
    return (
      <DetailErrorState
        message="Không tìm thấy nội dung hoặc không thể tải bài viết."
        onRetry={() => {
          void refetch();
        }}
        onBack={goBack}
      />
    );
  }

  const dateLabel = formatDate(article.createdAt);
  const isKnowledge = article.type === "library";

  const handleFavorite = () => {
    toggleLike(undefined, {
      onError: () => {
        Toast.show({
          type: "error",
          text1: "Không thể cập nhật nội dung đã lưu",
        });
      },
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: article.title,
        message: articleShareMessage(article),
      });
    } catch {
      Toast.show({
        type: "error",
        text1: "Không thể chia sẻ nội dung",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <DetailHeader
        title={isKnowledge ? "Kiến thức" : "Bài viết"}
        onBack={goBack}
        isFavorite={article.isLiked}
        favoriteDisabled={isTogglingLike}
        onToggleFavorite={handleFavorite}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 110,
        }}
      >
        <View className="px-6 pt-5">
          {/* Cover image */}
          <DetailCoverImage
            uri={article.image}
            width={contentWidth}
            height={Math.min(260, Math.max(190, width * 0.55))}
            accessibilityLabel={`Ảnh minh họa: ${article.title}`}
          />

          {/* Category */}
          {article.category?.title && (
            <View className="mt-6 self-start rounded-full bg-primary-50 px-3 py-1.5">
              <Text className="text-xs font-semibold text-primary-main">
                {article.category.title}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text className="mt-4 text-2xl font-bold leading-9 text-grey-900">
            {article.title}
          </Text>

          {/* Date and share */}
          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              {dateLabel && (
                <Text className="text-xs text-grey-500">{dateLabel}</Text>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chia sẻ nội dung"
              onPress={() => {
                void handleShare();
              }}
              className="min-h-11 justify-center rounded-xl bg-grey-100 px-4"
            >
              <Text className="text-sm font-semibold text-primary-main">
                Chia sẻ
              </Text>
            </Pressable>
          </View>

          {/* Background refresh failure */}
          {error && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void refetch();
              }}
              className="mt-4 rounded-xl bg-grey-50 p-3"
            >
              <Text className="text-sm text-red-600">
                Chưa cập nhật được nội dung. Chạm để thử lại.
              </Text>
            </Pressable>
          )}

          {/* Content */}
          <View className="mt-6 border-t border-grey-100 pt-5">
            <SafeHtmlContent
              html={article.content ?? ""}
              contentWidth={contentWidth}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
