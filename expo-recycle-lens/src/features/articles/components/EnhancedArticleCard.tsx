import { RemoteImage } from "@/shared/components/ui/RemoteImage";
import { Heart } from "iconsax-react-nativejs";
import { Pressable, Text, View } from "react-native";
import { Article } from "../types/articles.types";

interface EnhancedArticleCardProps {
  item: Pick<Article, "id" | "title" | "image" | "category" | "createdAt">;
  onPress?: () => void;
  width?: string;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
  favoriteDisabled?: boolean;
}

export const EnhancedArticleCard = ({
  item,
  onPress,
  width = "w-64",
  isFavorite = false,
  onFavoritePress,
  favoriteDisabled = false,
}: EnhancedArticleCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <View className={`${width} mb-4 relative`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đọc ${item.title}`}
        onPress={onPress}
        className="bg-grey-200 rounded-[28px] overflow-hidden border border-grey-100 shadow-sm"
      >
        <RemoteImage
          uri={item.image}
          style={{ width: "100%", height: 176 }}
          contentFit="cover"
        />
        <View className="p-4">
          {item.category && (
            <View className="mb-2">
              <Text className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full self-start">
                {item.category.title}
              </Text>
            </View>
          )}
          <Text
            className="text-sm font-bold text-grey-900 leading-5 mb-2"
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text className="text-xs text-grey-500">
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </Pressable>

      {onFavoritePress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? "Bỏ lưu bài viết" : "Lưu bài viết"}
          accessibilityState={{
            disabled: favoriteDisabled,
            selected: isFavorite,
          }}
          onPress={onFavoritePress}
          disabled={favoriteDisabled}
          className="absolute top-3 right-3 h-11 w-11 rounded-full bg-white/90 items-center justify-center border border-grey-100 shadow-sm"
        >
          <Heart
            size={18}
            color={isFavorite ? "#FF4B4B" : "#1C2B36"}
            variant={isFavorite ? "Bold" : "Linear"}
          />
        </Pressable>
      )}
    </View>
  );
};
