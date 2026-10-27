import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  CloseCircle,
  Heart,
  SearchNormal1,
} from "iconsax-react-nativejs";
import { SafeAreaView } from "react-native-safe-area-context";

import { useArticlePages } from "@/features/articles/lib/article-hooks";

import type { Article } from "@/features/articles/types/articles.types";

import { useWastePages } from "@/features/waste-library/lib/waste-hooks";
import type { WasteItem } from "@/features/waste-library/types/waste.types";

import { SavedWasteRow } from "../components/SavedWasteRow";
import { ArticleListCard } from "../components/ArticleListCard";

// ================================================
// TYPES & CONFIGURATION
// ================================================

type SavedTab = "waste" | "posts" | "knowledge";
type ArticleSavedTab = Exclude<SavedTab, "waste">;

const SAVED_TABS: {
  id: SavedTab;
  label: string;
}[] = [
  { id: "waste", label: "Rác chuẩn" },
  { id: "posts", label: "Bài viết" },
  { id: "knowledge", label: "Kiến thức" },
];

const PAGE_SIZE = 12;

function resolveTab(value: unknown): SavedTab {
  if (value === "posts" || value === "knowledge" || value === "waste") {
    return value;
  }

  return "waste";
}

// ================================================
// REUSABLE STATES
// ================================================

function SavedEmptyState({
  message,
  keyword,
  onClearSearch,
  onExplore,
}: {
  message: string;
  keyword: string;
  onClearSearch: () => void;
  onExplore: () => void;
}) {
  const hasSearch = keyword.length > 0;

  return (
    <View className="items-center px-6 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <Heart size={28} color="#159947" variant="Linear" />
      </View>

      <Text className="text-center text-lg font-bold text-grey-900">
        {hasSearch ? "Không tìm thấy nội dung" : "Chưa có nội dung đã lưu"}
      </Text>

      <Text className="mt-2 text-center text-sm leading-6 text-grey-600">
        {message}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={hasSearch ? onClearSearch : onExplore}
        className="mt-5 min-h-12 items-center justify-center rounded-xl bg-primary-main px-5"
      >
        <Text className="font-semibold text-white">
          {hasSearch ? "Xóa từ khóa" : "Khám phá nội dung"}
        </Text>
      </Pressable>
    </View>
  );
}

function SavedErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-center text-base font-semibold text-grey-900">
        Không thể tải nội dung đã lưu
      </Text>

      <Text className="mt-2 text-center text-sm text-grey-600">
        Vui lòng kiểm tra kết nối và thử lại.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="mt-5 min-h-12 items-center justify-center rounded-xl bg-primary-main px-6"
      >
        <Text className="font-semibold text-white">Thử lại</Text>
      </Pressable>
    </View>
  );
}

// ================================================
// GENERIC PAGINATED SAVED LIST
// ================================================

interface SavedListProps<T> {
  items: T[];
  total?: number;

  pending: boolean;
  error: boolean;
  refreshing: boolean;
  fetchingNextPage: boolean;
  nextPageError: boolean;
  hasNextPage: boolean;

  keyword: string;
  emptyMessage: string;

  keyForItem: (item: T) => string;
  renderRow: (item: T) => ReactElement;

  onRefresh: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onRetryNextPage: () => void;
  onClearSearch: () => void;
  onExplore: () => void;
}

function SavedList<T>({
  items,
  total,
  pending,
  error,
  refreshing,
  fetchingNextPage,
  nextPageError,
  hasNextPage,
  keyword,
  emptyMessage,
  keyForItem,
  renderRow,
  onRefresh,
  onLoadMore,
  onRetry,
  onRetryNextPage,
  onClearSearch,
  onExplore,
}: SavedListProps<T>) {
  if (pending && items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#159947" />

        <Text className="mt-3 text-sm text-grey-500">
          Đang tải nội dung đã lưu...
        </Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return <SavedErrorState onRetry={onRetry} />;
  }

  return (
    <FlatList<T>
      data={items}
      keyExtractor={keyForItem}
      renderItem={({ item }) => renderRow(item)}
      ItemSeparatorComponent={() => <View className="h-3" />}
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 110,
        flexGrow: 1,
      }}
      refreshing={refreshing && !fetchingNextPage}
      onRefresh={onRefresh}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        typeof total === "number" && items.length > 0 ? (
          <Text className="mb-3 text-xs text-grey-500">{total} mục</Text>
        ) : null
      }
      ListEmptyComponent={
        <SavedEmptyState
          message={emptyMessage}
          keyword={keyword}
          onClearSearch={onClearSearch}
          onExplore={onExplore}
        />
      }
      ListFooterComponent={
        nextPageError ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetryNextPage}
            className="py-6"
          >
            <Text className="text-center text-red-600">
              Không tải được trang tiếp theo. Thử lại.
            </Text>
          </Pressable>
        ) : fetchingNextPage ? (
          <ActivityIndicator color="#159947" className="py-5" />
        ) : error && items.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="py-5"
          >
            <Text className="text-center text-red-600">
              Không cập nhật được danh sách. Thử lại.
            </Text>
          </Pressable>
        ) : hasNextPage ? (
          <Pressable
            accessibilityRole="button"
            onPress={onLoadMore}
            className="py-5"
          >
            <Text className="text-center font-semibold text-primary-main">
              Tải thêm
            </Text>
          </Pressable>
        ) : null
      }
    />
  );
}

// ================================================
// CANONICAL WASTE FAVORITES
// ================================================

function SavedWasteList({
  keyword,
  onClearSearch,
}: {
  keyword: string;
  onClearSearch: () => void;
}) {
  const router = useRouter();

  const query = useWastePages(
    {
      keyword: keyword || undefined,
      perPage: PAGE_SIZE,
    },
    true
  );

  const items: WasteItem[] =
    query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <SavedList<WasteItem>
      items={items}
      total={query.data?.pages[0]?.total}
      pending={query.isPending}
      error={query.isError}
      refreshing={query.isRefetching}
      fetchingNextPage={query.isFetchingNextPage}
      nextPageError={query.isFetchNextPageError}
      hasNextPage={!!query.hasNextPage}
      keyword={keyword}
      emptyMessage={
        keyword
          ? "Không có loại rác đã lưu phù hợp với từ khóa."
          : "Hãy lưu các loại rác từ Thư viện để xem lại tại đây."
      }
      keyForItem={(item) => item.slug}
      renderRow={(item) => (
        <SavedWasteRow
          item={item}
          onPress={() =>
            router.push({
              pathname: "/(protected)/waste-details/[id]",
              params: {
                id: item.articleId,
              },
            })
          }
        />
      )}
      onRefresh={() => {
        void query.refetch();
      }}
      onLoadMore={() => {
        if (query.hasNextPage && !query.isFetching && !query.isError) {
          void query.fetchNextPage();
        }
      }}
      onRetry={() => {
        void query.refetch();
      }}
      onRetryNextPage={() => {
        void query.fetchNextPage();
      }}
      onClearSearch={onClearSearch}
      onExplore={() => router.push("/(protected)/(tabs)/library")}
    />
  );
}

// ================================================
// ARTICLE & KNOWLEDGE FAVORITES
// ================================================

function SavedArticleList({
  kind,
  keyword,
  onClearSearch,
}: {
  kind: ArticleSavedTab;
  keyword: string;
  onClearSearch: () => void;
}) {
  const router = useRouter();

  const isKnowledge = kind === "knowledge";

  const query = useArticlePages(
    {
      type: isKnowledge ? "library" : "post",
      libraryScope: isKnowledge ? "legacy" : undefined,
      keyword: keyword || undefined,
      sortBy: "latest",
      perPage: PAGE_SIZE,
    },
    true
  );

  const items: Article[] = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <SavedList<Article>
      items={items}
      total={query.data?.pages[0]?.total}
      pending={query.isPending}
      error={query.isError}
      refreshing={query.isRefetching}
      fetchingNextPage={query.isFetchingNextPage}
      nextPageError={query.isFetchNextPageError}
      hasNextPage={!!query.hasNextPage}
      keyword={keyword}
      emptyMessage={
        keyword
          ? "Không có nội dung đã lưu phù hợp với từ khóa."
          : isKnowledge
            ? "Bạn chưa lưu kiến thức môi trường nào."
            : "Bạn chưa lưu bài viết nào."
      }
      keyForItem={(item) => item.id}
      renderRow={(item) => (
        <ArticleListCard
          item={item}
          onPress={() =>
            router.push({
              pathname: "/(protected)/article-details/[id]",
              params: {
                id: item.id,
              },
            })
          }
        />
      )}
      onRefresh={() => {
        void query.refetch();
      }}
      onLoadMore={() => {
        if (query.hasNextPage && !query.isFetching && !query.isError) {
          void query.fetchNextPage();
        }
      }}
      onRetry={() => {
        void query.refetch();
      }}
      onRetryNextPage={() => {
        void query.fetchNextPage();
      }}
      onClearSearch={onClearSearch}
      onExplore={() => router.push("/(protected)/(tabs)/articles")}
    />
  );
}

// ================================================
// FAVORITES SCREEN
// ================================================

export function FavoritesScreen() {
  const router = useRouter();

  const { tab } = useLocalSearchParams<{
    tab?: string;
  }>();

  const activeTab = resolveTab(tab);

  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const clearSearch = () => {
    setSearch("");
    setKeyword("");
  };

  const changeTab = (nextTab: SavedTab) => {
    if (nextTab === activeTab) {
      return;
    }

    clearSearch();

    router.setParams({
      tab: nextTab,
    });
  };

  const selectedTitle =
    activeTab === "waste"
      ? "Rác chuẩn đã lưu"
      : activeTab === "posts"
        ? "Bài viết đã lưu"
        : "Kiến thức đã lưu";

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* HEADER */}
      <View className="flex-row items-center px-5 pt-4 pb-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-xl bg-grey-100"
        >
          <ArrowLeft size={22} color="#161C24" />
        </Pressable>

        <View className="ml-3 flex-1">
          <Text className="text-2xl font-bold text-grey-900" numberOfLines={1}>
            Nội dung đã lưu
          </Text>

          <Text className="mt-1 text-xs text-grey-500">
            Xem lại những nội dung bạn quan tâm
          </Text>
        </View>

        <Heart size={24} color="#EB5757" variant="Bold" />
      </View>

      {/* CONTENT TABS */}
      <View className="px-5 pb-4">
        <View className="flex-row rounded-2xl bg-grey-100 p-1">
          {SAVED_TABS.map((item) => {
            const selected = activeTab === item.id;

            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{
                  selected,
                }}
                onPress={() => changeTab(item.id)}
                className={`min-h-12 flex-1 items-center justify-center rounded-xl px-1 ${
                  selected ? "bg-primary-main" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selected ? "text-white" : "text-grey-700"
                  }`}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* SEARCH */}
      <View className="px-5 pb-4">
        <View className="min-h-12 flex-row items-center rounded-2xl border border-grey-200 bg-grey-50 px-3">
          <SearchNormal1 size={20} color="#919EAB" />

          <TextInput
            accessibilityLabel="Tìm trong nội dung đã lưu"
            placeholder="Tìm trong mục đã lưu..."
            placeholderTextColor="#919EAB"
            value={search}
            onChangeText={setSearch}
            maxLength={100}
            autoCorrect={false}
            returnKeyType="search"
            className="ml-3 min-h-12 flex-1 text-sm text-grey-900"
          />

          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa từ khóa"
              onPress={clearSearch}
              className="h-10 w-10 items-center justify-center"
            >
              <CloseCircle size={19} color="#919EAB" />
            </Pressable>
          )}
        </View>
      </View>

      {/* SELECTED CONTENT */}
      <View className="px-5 pb-3">
        <Text className="text-sm font-bold text-grey-900">{selectedTitle}</Text>
      </View>

      {activeTab === "waste" ? (
        <SavedWasteList keyword={keyword} onClearSearch={clearSearch} />
      ) : (
        <SavedArticleList
          key={activeTab}
          kind={activeTab}
          keyword={keyword}
          onClearSearch={clearSearch}
        />
      )}
    </SafeAreaView>
  );
}
