import { useToggleLike } from "../lib/article-hooks";
import { Article } from "../types/articles.types";
import { EnhancedArticleCard } from "./EnhancedArticleCard";

type ArticleCardItem = Pick<
  Article,
  "id" | "title" | "image" | "category" | "createdAt" | "isLiked"
>;

interface ArticleCardWithFavoriteProps {
  item: ArticleCardItem;
  onPress?: () => void;
  width?: string;
}

export function ArticleCardWithFavorite({
  item,
  onPress,
  width,
}: ArticleCardWithFavoriteProps) {
  const { mutate: toggleLike, isPending } = useToggleLike(
    item.id,
    item.isLiked,
  );

  return (
    <EnhancedArticleCard
      item={item}
      width={width}
      onPress={onPress}
      isFavorite={item.isLiked}
      onFavoritePress={() => toggleLike()}
      favoriteDisabled={isPending}
    />
  );
}
