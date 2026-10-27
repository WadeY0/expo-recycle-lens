import { useCategoryOptions } from "@/features/waste-library/lib/category-hooks";
import { useRouter } from "expo-router";
import {
  ArrowDown2,
  ArrowLeft,
  CloseCircle,
  DocumentText,
  Heart,
  SearchNormal1,
} from "iconsax-react-nativejs";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useArticlePages } from "../lib/article-hooks";
import type { GetArticlesParams } from "../types/articles.types";
import { ArticleListCard } from "@/features/home/components/ArticleListCard";

type ContentType = "post" | "library";
type SortOption = NonNullable<GetArticlesParams["sortBy"]>;

interface ArticleBrowserProps {
  favorites?: boolean;
}

const CONTENT_TABS: {
  value: ContentType;
  label: string;
}[] = [
  { value: "post", label: "Bài viết" },
  { value: "library", label: "Kiến thức" },
];

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
}[] = [
  { value: "latest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "title_asc", label: "Tên A-Z" },
  { value: "title_desc", label: "Tên Z-A" },
];

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`mr-2 rounded-full border px-4 py-2.5 ${
        selected
          ? "border-primary-main bg-primary-main"
          : "border-grey-200 bg-white"
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          selected ? "text-white" : "text-grey-700"
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ArticleBrowser({ favorites = false }: ArticleBrowserProps) {
  const router = useRouter();

  // =====================================
  // UI STATE
  // =====================================

  const [contentType, setContentType] = useState<ContentType>("post");

  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");

  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>("latest");

  const [filtersOpen, setFiltersOpen] = useState(false);

  // =====================================
  // SEARCH DEBOUNCE
  // =====================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // =====================================
  // DATA
  // =====================================

  const categories = useCategoryOptions(contentType);

  const articles = useArticlePages(
    {
      type: contentType,
      libraryScope: contentType === "library" ? "legacy" : undefined,
      keyword: keyword || undefined,
      categoryId: categoryId ?? undefined,
      sortBy,
      perPage: 12,
    },
    favorites
  );

  const items = articles.data?.pages.flatMap((page) => page.data) ?? [];

  const total = articles.data?.pages[0]?.total;

  const categoryItems = categories.data?.data ?? [];

  const selectedCategoryTitle = categoryItems.find(
    (item) => item.id === categoryId
  )?.title;

  const selectedSortTitle =
    SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? "Mới nhất";

  const hasActiveFilters = categoryId !== null || sortBy !== "latest";

  // =====================================
  // ACTIONS
  // =====================================

  const switchContentType = (nextType: ContentType) => {
    if (nextType === contentType) {
      return;
    }

    setContentType(nextType);

    // Do not carry filters from one
    // content domain into another.
    setSearch("");
    setKeyword("");
    setCategoryId(null);
    setSortBy("latest");
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setSearch("");
    setKeyword("");
    setCategoryId(null);
    setSortBy("latest");
  };

  const openDetail = (id: string) => {
    router.push({
      pathname: "/(protected)/article-details/[id]",
      params: { id },
    });
  };

  const loadMore = () => {
    if (articles.hasNextPage && !articles.isFetching && !articles.isError) {
      void articles.fetchNextPage();
    }
  };

  // =====================================
  // EMPTY STATE
  // =====================================

  const emptyMessage = () => {
    if (search.trim() || keyword || categoryId) {
      return "Không tìm thấy nội dung phù hợp. Hãy thử từ khóa hoặc danh mục khác.";
    }

    if (favorites) {
      return contentType === "post"
        ? "Bạn chưa lưu bài viết nào."
        : "Bạn chưa lưu nội dung kiến thức nào.";
    }

    return contentType === "post"
      ? "Chưa có bài viết."
      : "Chưa có nội dung kiến thức môi trường.";
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* ================================= */}
      {/* HEADER                            */}
      {/* ================================= */}

      <View className="flex-row items-center px-6 pt-4 pb-3">
        {favorites && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-grey-100"
          >
            <ArrowLeft size={22} color="#161C24" />
          </Pressable>
        )}

        <View className="flex-1">
          <Text className="text-2xl font-bold text-grey-900" numberOfLines={1}>
            {favorites ? "Nội dung đã lưu" : "Bài viết"}
          </Text>

          {!favorites && (
            <Text className="mt-1 text-xs text-grey-500">
              Khám phá kiến thức và lối sống xanh
            </Text>
          )}
        </View>

        {!favorites && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở bài viết và kiến thức đã lưu"
            onPress={() =>
              router.push({
                pathname: "/(protected)/favorites",
                params: {
                  tab: contentType === "library" ? "knowledge" : "posts",
                },
              })
            }
            className="ml-3 h-11 w-11 items-center justify-center rounded-full bg-grey-100"
          >
            <Heart size={22} color="#161C24" />
          </Pressable>
        )}
      </View>

      {/* ================================= */}
      {/* CONTENT TYPE TABS                 */}
      {/* ================================= */}

      <View className="px-6 pt-3 pb-4">
        <View className="flex-row rounded-2xl bg-grey-100 p-1">
          {CONTENT_TABS.map((tab) => {
            const active = contentType === tab.value;

            return (
              <Pressable
                key={tab.value}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{
                  selected: active,
                }}
                onPress={() => switchContentType(tab.value)}
                className={`flex-1 items-center justify-center rounded-xl py-3 ${
                  active ? "bg-primary-main" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    active ? "text-white" : "text-grey-600"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ================================= */}
      {/* SEARCH                            */}
      {/* ================================= */}

      <View className="px-6 pb-3">
        <View className="h-12 flex-row items-center rounded-2xl border border-grey-200 bg-grey-50 px-4">
          <SearchNormal1 size={20} color="#919EAB" />

          <TextInput
            accessibilityLabel={
              contentType === "post"
                ? "Tìm bài viết"
                : "Tìm kiến thức môi trường"
            }
            placeholder={
              contentType === "post"
                ? "Tìm bài viết..."
                : "Tìm kiến thức môi trường..."
            }
            placeholderTextColor="#919EAB"
            value={search}
            onChangeText={setSearch}
            maxLength={200}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            className="ml-3 flex-1 text-sm text-grey-900"
          />

          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa từ khóa tìm kiếm"
              onPress={() => {
                setSearch("");
                setKeyword("");
              }}
              className="h-10 w-10 items-center justify-center"
            >
              <CloseCircle size={19} color="#919EAB" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ================================= */}
      {/* RESULTS & FILTER TOGGLE           */}
      {/* ================================= */}

      <View className="flex-row items-center justify-between px-6 pb-3">
        <Text className="text-xs text-grey-500">
          {typeof total === "number"
            ? `${total} nội dung`
            : "Danh sách nội dung"}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            filtersOpen ? "Đóng bộ lọc" : "Mở bộ lọc và sắp xếp"
          }
          accessibilityState={{
            expanded: filtersOpen,
          }}
          onPress={() => setFiltersOpen((previous) => !previous)}
          className="min-h-11 flex-row items-center"
        >
          <Text className="mr-2 text-sm font-semibold text-primary-main">
            {hasActiveFilters
              ? `Bộ lọc · ${selectedSortTitle}`
              : "Lọc & sắp xếp"}
          </Text>

          <ArrowDown2
            size={17}
            color="#159947"
            style={{
              transform: [
                {
                  rotate: filtersOpen ? "180deg" : "0deg",
                },
              ],
            }}
          />
        </Pressable>
      </View>

      {/* ================================= */}
      {/* EXPANDABLE FILTERS                */}
      {/* ================================= */}

      {filtersOpen && (
        <View className="mx-6 mb-4 rounded-2xl border border-grey-200 bg-grey-50 py-4">
          <View className="mb-3 px-4">
            <Text className="text-sm font-bold text-grey-900">Danh mục</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
            }}
          >
            <FilterChip
              label="Tất cả"
              selected={categoryId === null}
              onPress={() => setCategoryId(null)}
            />

            {categoryItems.map((category) => (
              <FilterChip
                key={category.id}
                label={category.title}
                selected={categoryId === category.id}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </ScrollView>

          {categories.isLoading && (
            <ActivityIndicator color="#159947" className="mt-3" />
          )}

          {categories.isError && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void categories.refetch();
              }}
              className="px-4 py-3"
            >
              <Text className="text-sm text-red-600">
                Không tải được danh mục. Chạm để thử lại.
              </Text>
            </Pressable>
          )}

          <View className="mt-5 mb-3 px-4">
            <Text className="text-sm font-bold text-grey-900">Sắp xếp</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={sortBy === option.value}
                onPress={() => setSortBy(option.value)}
              />
            ))}
          </ScrollView>

          {hasActiveFilters && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đặt lại bộ lọc"
              onPress={() => {
                setCategoryId(null);
                setSortBy("latest");
              }}
              className="self-start px-4 pt-4"
            >
              <Text className="text-sm font-semibold text-primary-main">
                Đặt lại bộ lọc
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ================================= */}
      {/* CURRENT CATEGORY INDICATOR        */}
      {/* ================================= */}

      {categoryId !== null && selectedCategoryTitle && (
        <View className="px-6 pb-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bỏ lọc danh mục ${selectedCategoryTitle}`}
            onPress={() => setCategoryId(null)}
            className="self-start flex-row items-center rounded-full bg-primary-50 px-3 py-2"
          >
            <Text
              className="mr-2 max-w-[200px] text-xs font-medium text-primary-main"
              numberOfLines={1}
            >
              {selectedCategoryTitle}
            </Text>

            <CloseCircle size={16} color="#159947" />
          </Pressable>
        </View>
      )}

      {/* ================================= */}
      {/* ARTICLE LIST                      */}
      {/* ================================= */}

      {articles.isPending && items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#159947" />

          <Text className="mt-3 text-sm text-grey-500">
            Đang tải nội dung...
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          extraData={contentType}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 4,
            paddingBottom: 110,
            flexGrow: 1,
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <ArticleListCard item={item} onPress={() => openDetail(item.id)} />
          )}
          refreshing={articles.isRefetching && !articles.isFetchingNextPage}
          onRefresh={() => {
            void articles.refetch();
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.25}
          ListEmptyComponent={
            articles.isError ? (
              <View className="items-center px-4 py-16">
                <Text className="text-center text-grey-700">
                  Không thể tải nội dung.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void articles.refetch();
                  }}
                  className="mt-4 rounded-xl bg-primary-main px-5 py-3"
                >
                  <Text className="font-semibold text-white">Thử lại</Text>
                </Pressable>
              </View>
            ) : (
              <View className="items-center px-4 py-16">
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                  <DocumentText size={30} color="#159947" />
                </View>

                <Text className="text-center text-base font-bold text-grey-900">
                  Chưa có nội dung
                </Text>

                <Text className="mt-2 text-center text-sm leading-6 text-grey-600">
                  {emptyMessage()}
                </Text>

                {(search.trim() ||
                  keyword ||
                  categoryId ||
                  sortBy !== "latest") && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={resetFilters}
                    className="mt-5 rounded-xl bg-primary-50 px-5 py-3"
                  >
                    <Text className="font-semibold text-primary-main">
                      Xóa bộ lọc
                    </Text>
                  </Pressable>
                )}
              </View>
            )
          }
          ListFooterComponent={
            articles.isFetchNextPageError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void articles.fetchNextPage();
                }}
                className="py-6"
              >
                <Text className="text-center text-red-600">
                  Không tải được trang tiếp theo. Thử lại.
                </Text>
              </Pressable>
            ) : articles.isFetchingNextPage ? (
              <ActivityIndicator color="#159947" className="py-6" />
            ) : articles.isError && items.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void articles.refetch();
                }}
                className="py-6"
              >
                <Text className="text-center text-red-600">
                  Có lỗi khi cập nhật danh sách. Thử lại.
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
