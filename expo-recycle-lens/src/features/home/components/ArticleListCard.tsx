import { useToggleLike } from "@/features/articles/lib/article-hooks";
import { Article } from "@/features/articles/types/articles.types";
import { RemoteImage } from "@/shared/components/ui/RemoteImage";
import { DocumentText, Heart } from "iconsax-react-nativejs";
import { Pressable, Text, View } from "react-native";

type ArticleListItem = Pick<
  Article,
  "id" | "title" | "type" | "image" | "category" | "createdAt" | "isLiked"
>;

interface ArticleListCardProps {
  item: ArticleListItem;
  onPress: () => void;
}

function formatArticleDate(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ArticleListCard({ item, onPress }: ArticleListCardProps) {
  const { mutate: toggleFavorite, isPending } = useToggleLike(
    item.id,
    item.isLiked
  );

  const categoryLabel =
    item.category?.title ??
    (item.type === "library" ? "Kiến thức môi trường" : "Bài viết");

  const dateLabel = formatArticleDate(item.createdAt);

  return (
    <View className="flex-row rounded-2xl border border-grey-200 bg-white p-3">
      {/* Image and favorite */}
      <View className="relative h-[106px] w-[106px]">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Đọc ${item.title}`}
          onPress={onPress}
          className="h-full w-full overflow-hidden rounded-xl"
        >
          {item.image ? (
            <RemoteImage
              uri={item.image}
              style={{
                width: 106,
                height: 106,
                borderRadius: 12,
              }}
              contentFit="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-primary-50">
              <DocumentText size={28} color="#159947" variant="Linear" />
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            item.isLiked ? `Bỏ lưu ${item.title}` : `Lưu ${item.title}`
          }
          accessibilityState={{
            selected: item.isLiked,
            disabled: isPending,
          }}
          disabled={isPending}
          onPress={() => toggleFavorite()}
          className="absolute right-1 top-1 h-10 w-10 items-center justify-center rounded-full bg-white/95 border border-grey-100"
        >
          <Heart
            size={19}
            color={item.isLiked ? "#EB5757" : "#637381"}
            variant={item.isLiked ? "Bold" : "Linear"}
          />
        </Pressable>
      </View>

      {/* Article information */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem chi tiết ${item.title}`}
        onPress={onPress}
        className="ml-3 flex-1 justify-between py-1"
      >
        <View>
          <Text
            className="text-xs font-semibold text-primary-main mb-2"
            numberOfLines={1}
          >
            {categoryLabel}
          </Text>

          <Text
            className="text-[15px] font-bold text-grey-900 leading-[22px]"
            numberOfLines={3}
          >
            {item.title}
          </Text>
        </View>

        {dateLabel && (
          <Text className="mt-2 text-xs text-grey-500">{dateLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}
