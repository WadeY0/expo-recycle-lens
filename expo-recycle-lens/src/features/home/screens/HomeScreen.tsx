import {
  useArticles,
  useToggleLike,
} from "@/features/articles/lib/article-hooks";
import type { Article } from "@/features/articles/types/articles.types";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  useWasteFavorite,
  useWastePages,
} from "@/features/waste-library/lib/waste-hooks";
import type { WasteItem } from "@/features/waste-library/types/waste.types";
import { RemoteImage } from "@/shared/components/ui/RemoteImage";
import { getImageUrl } from "@/shared/utils/image-utils";
import { useRouter } from "expo-router";
import {
  BookSquare,
  DocumentText,
  Heart,
  Scan,
  SearchNormal1,
} from "iconsax-react-nativejs";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  HomeQueryFeedback,
  SectionHeader,
} from "../components/HomeScreenComponents";
import { useCallback } from "react";

import { useFocusEffect } from "expo-router";

import { useEcoOverview } from "@/features/gamification/lib/gamification-hooks";

import { HomePlayerHeader } from "../components/HomePlayerHeader";

// ======================================================
// TYPES
// ======================================================

type HomeArticle = Pick<
  Article,
  "id" | "title" | "image" | "category" | "createdAt" | "isLiked"
>;

// ======================================================
// AI SCAN HERO
// ======================================================

function HomeScanHero({ onPress }: { onPress: () => void }) {
  return (
    <View className="rounded-3xl bg-primary-main px-5 py-5 overflow-hidden">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-white/80 text-xs font-bold tracking-wider mb-3">
            RECYCLELENS AI
          </Text>

          <Text className="text-2xl font-bold text-white leading-8">
            Phân loại rác dễ dàng hơn với AI
          </Text>
        </View>

        <View className="h-14 w-14 rounded-2xl bg-white/15 items-center justify-center">
          <Scan size={30} color="#FFFFFF" variant="Linear" />
        </View>
      </View>

      <Text className="text-sm text-white/90 leading-6 mt-3">
        Chụp hoặc chọn ảnh vật thể để nhận phân tích và gợi ý xử lý.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mở AI Scanner"
        onPress={onPress}
        className="mt-5 h-12 flex-row items-center justify-center rounded-2xl bg-white"
      >
        <Scan size={20} color="#159947" variant="Linear" />

        <Text className="ml-2 text-base font-bold text-primary-main">
          Quét ảnh ngay
        </Text>
      </Pressable>
    </View>
  );
}

// ======================================================
// SEARCH ENTRY
// ======================================================

function HomeSearchEntry({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tra cứu rác trong thư viện"
      onPress={onPress}
      className="h-13 min-h-12 flex-row items-center rounded-2xl border border-grey-100 bg-grey-50 px-4"
    >
      <SearchNormal1 size={21} color="#919EAB" variant="Linear" />
      <Text className="ml-3 flex-1 text-sm text-grey-500">
        Tìm rác, bài viết, kiến thức...
      </Text>

      <Text className="text-primary-main text-lg font-medium">→</Text>
    </Pressable>
  );
}

// ======================================================
// CANONICAL WASTE PREVIEW
// ======================================================

function HomeWastePreviewCard({
  item,
  width,
  favoriteDisabled,
  onPress,
  onFavoritePress,
}: {
  item: WasteItem;
  width: number;
  favoriteDisabled: boolean;
  onPress: () => void;
  onFavoritePress: () => void;
}) {
  return (
    <View
      style={{ width }}
      className="mr-3 rounded-2xl border border-grey-100 bg-white overflow-hidden"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem thông tin ${item.name}`}
        onPress={onPress}
      >
        {item.image ? (
          <RemoteImage
            uri={item.image}
            style={{
              width: "100%",
              height: 112,
            }}
            contentFit="cover"
          />
        ) : (
          <View className="h-28 bg-grey-50 items-center justify-center">
            <Text
              accessibilityLabel={item.guidance.illustration.alt}
              className="text-5xl"
            >
              {item.guidance.illustration.emoji}
            </Text>
          </View>
        )}

        <View className="px-3 pt-3 pb-4">
          <Text
            className="text-sm font-bold text-grey-900 leading-5 min-h-10"
            numberOfLines={2}
          >
            {item.name}
          </Text>

          <Text className="text-xs text-grey-500 mt-2" numberOfLines={1}>
            {item.category?.title ?? "Loại rác"}
          </Text>

          {item.guidance.hazardous && (
            <Text
              className="text-xs font-semibold text-red-600 mt-2"
              numberOfLines={1}
            >
              Thu gom đặc biệt
            </Text>
          )}
        </View>
      </Pressable>

      {/* Separate press target: no nested Pressable */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.isFavorite ? "Bỏ lưu mục rác" : "Lưu mục rác"}
        accessibilityState={{
          selected: item.isFavorite,
          disabled: favoriteDisabled,
        }}
        disabled={favoriteDisabled}
        onPress={onFavoritePress}
        className="absolute right-2 top-2 h-11 w-11 rounded-full bg-white/95 items-center justify-center"
      >
        <Heart
          size={20}
          color={item.isFavorite ? "#EB5757" : "#161C24"}
          variant={item.isFavorite ? "Bold" : "Linear"}
        />
      </Pressable>
    </View>
  );
}

// ======================================================
// ARTICLE PREVIEW ROW
// ======================================================

function HomeArticlePreviewRow({
  item,
  onPress,
}: {
  item: HomeArticle;
  onPress: () => void;
}) {
  const { mutate: toggleFavorite, isPending } = useToggleLike(
    item.id,
    item.isLiked
  );

  return (
    <View className="flex-row items-center border-b border-grey-100 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đọc ${item.title}`}
        onPress={onPress}
        className="flex-1 flex-row items-center"
      >
        {item.image ? (
          <RemoteImage
            uri={item.image}
            style={{
              width: 88,
              height: 88,
              borderRadius: 14,
            }}
            contentFit="cover"
          />
        ) : (
          <View className="w-[88px] h-[88px] rounded-2xl bg-grey-100 items-center justify-center">
            <DocumentText size={28} color="#919EAB" />
          </View>
        )}

        <View className="flex-1 ml-3">
          <Text
            className="text-xs font-medium text-primary-main mb-1"
            numberOfLines={1}
          >
            {item.category?.title ?? "Bài viết"}
          </Text>

          <Text
            className="text-sm font-bold text-grey-900 leading-5"
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text className="text-xs text-grey-500 mt-2">Đọc bài viết →</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.isLiked ? "Bỏ lưu bài viết" : "Lưu bài viết"}
        accessibilityState={{
          selected: item.isLiked,
          disabled: isPending,
        }}
        disabled={isPending}
        onPress={() => toggleFavorite()}
        className="h-11 w-11 ml-1 items-center justify-center"
      >
        <Heart
          size={20}
          color={item.isLiked ? "#EB5757" : "#919EAB"}
          variant={item.isLiked ? "Bold" : "Linear"}
        />
      </Pressable>
    </View>
  );
}

// ======================================================
// HOME SCREEN
// ======================================================

export function HomeScreen() {
  const router = useRouter();

  const { width } = useWindowDimensions();

  const user = useAuthStore((state) => state.user);

  const ecoQuery = useEcoOverview();

  // Refresh XP when Home becomes focused.
  // Useful after returning from an AI Scan
  // that may have awarded XP.
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        void ecoQuery.refetch();
      }
    }, [user?.id, ecoQuery.refetch])
  );

  // Canonical waste: same data source as Library.
  const wasteQuery = useWastePages({
    perPage: 4,
  });

  const wasteFavorite = useWasteFavorite();

  // Editorial posts only.
  const articleQuery = useArticles({
    status: "active",
    type: "post",
    sortBy: "latest",
    perPage: 3,
  });

  // Home is a preview, so only the first page is shown.
  const wasteItems = wasteQuery.data?.pages[0]?.data ?? [];

  const articles = articleQuery.data?.data ?? [];

  const isRefreshing =
    wasteQuery.isRefetching ||
    articleQuery.isRefetching ||
    ecoQuery.isRefetching;

  const cardWidth = Math.min(184, Math.max(150, width * 0.42));

  const refreshHome = () => {
    void wasteQuery.refetch();
    void articleQuery.refetch();

    if (user?.id) {
      void ecoQuery.refetch();
    }
  };

  const openScanner = () => {
    router.push("/scanner");
  };
  const openSearch = () => {
    router.push("/search");
  };

  const openLibrary = () => {
    router.push("/(protected)/(tabs)/library");
  };

  const openArticles = () => {
    router.push("/(protected)/(tabs)/articles");
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 115,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshHome}
            tintColor="#159947"
            colors={["#159947"]}
          />
        }
      >
        {/* ==================================== */}
        {/* USER HEADER                          */}
        {/* ==================================== */}

        {/* USER HEADER WITH GAMIFICATION */}
        <HomePlayerHeader
          user={user}
          overview={ecoQuery.data}
          isLoading={ecoQuery.isPending}
          isError={ecoQuery.isError}
        />

        {/* ==================================== */}
        {/* AI SCANNER HERO                     */}
        {/* ==================================== */}

        <View className="px-6">
          <HomeScanHero onPress={openScanner} />
        </View>

        {/* ==================================== */}
        {/* SEARCH ENTRY                        */}
        {/* ==================================== */}

        <View className="px-6 mt-5">
          <HomeSearchEntry onPress={openSearch} />
        </View>

        {/* ==================================== */}
        {/* CANONICAL WASTE LIBRARY PREVIEW      */}
        {/* ==================================== */}

        <View className="mt-8">
          <View className="px-6">
            <SectionHeader title="Khám phá thư viện" onSeeAll={openLibrary} />

            <Text className="text-sm text-grey-500 mb-4">
              Tìm hiểu các loại rác và cách xử lý phù hợp.
            </Text>
          </View>

          {wasteQuery.isPending ||
          wasteQuery.isError ||
          wasteItems.length === 0 ? (
            <View className="px-6">
              {wasteQuery.isPending ? (
                <ActivityIndicator color="#159947" className="py-6" />
              ) : (
                <HomeQueryFeedback
                  pending={false}
                  error={wasteQuery.isError}
                  empty={!wasteQuery.isError && wasteItems.length === 0}
                  retry={() => {
                    void wasteQuery.refetch();
                  }}
                  emptyText="Thư viện chưa có nội dung."
                />
              )}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft: 24,
                paddingRight: 12,
              }}
            >
              {wasteItems.map((item) => (
                <HomeWastePreviewCard
                  key={item.slug}
                  item={item}
                  width={cardWidth}
                  favoriteDisabled={wasteFavorite.isPending}
                  onPress={() =>
                    router.push({
                      pathname: "/(protected)/waste-details/[id]",
                      params: {
                        id: item.articleId,
                      },
                    })
                  }
                  onFavoritePress={() => {
                    wasteFavorite.mutate({
                      id: item.articleId,
                      saved: !item.isFavorite,
                    });
                  }}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ==================================== */}
        {/* ARTICLES PREVIEW                    */}
        {/* ==================================== */}

        <View className="mt-8 px-6">
          <SectionHeader title="Bài viết mới" onSeeAll={openArticles} />

          <Text className="text-sm text-grey-500 mb-3">
            Khám phá kiến thức và những thói quen sống xanh.
          </Text>

          {articleQuery.isPending ||
          articleQuery.isError ||
          articles.length === 0 ? (
            articleQuery.isPending ? (
              <ActivityIndicator color="#159947" className="py-6" />
            ) : (
              <HomeQueryFeedback
                pending={false}
                error={articleQuery.isError}
                empty={!articleQuery.isError && articles.length === 0}
                retry={() => {
                  void articleQuery.refetch();
                }}
                emptyText="Chưa có bài viết."
              />
            )
          ) : (
            <View>
              {articles.map((article) => (
                <HomeArticlePreviewRow
                  key={article.id}
                  item={article}
                  onPress={() =>
                    router.push({
                      pathname: "/(protected)/article-details/[id]",
                      params: {
                        id: article.id,
                      },
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>

        {/* ==================================== */}
        {/* BOTTOM LINK                         */}
        {/* ==================================== */}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Khám phá thêm nội dung trong thư viện"
          onPress={openLibrary}
          className="mx-6 mt-8 flex-row items-center justify-between rounded-2xl border border-grey-100 bg-grey-50 px-4 py-4"
        >
          <View className="flex-row items-center flex-1">
            <BookSquare size={24} color="#159947" variant="Linear" />

            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-grey-900">
                Khám phá thêm
              </Text>

              <Text className="text-xs text-grey-500 mt-1">
                Tra cứu kiến thức phân loại rác
              </Text>
            </View>
          </View>

          <Text className="text-lg text-primary-main">→</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
