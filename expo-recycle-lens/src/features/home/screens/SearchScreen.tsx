import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  CloseCircle,
  DocumentText,
  SearchNormal1,
} from "iconsax-react-nativejs";

import { RemoteImage } from "@/shared/components/ui/RemoteImage";
import type { Article } from "@/features/articles/types/articles.types";
import type { WasteItem } from "@/features/waste-library/types/waste.types";

import { useUnifiedSearch, type SearchScope } from "../lib/useUnifiedSearch";

type ResultKind = Exclude<SearchScope, "all">;

interface SearchHit {
  key: string;
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  image: string | null;
  emoji?: string;
}

const SEARCH_TABS: {
  value: SearchScope;
  label: string;
}[] = [
  { value: "all", label: "Tất cả" },
  { value: "waste", label: "Rác chuẩn" },
  { value: "posts", label: "Bài viết" },
  { value: "knowledge", label: "Kiến thức" },
];

function mapWaste(item: WasteItem): SearchHit {
  return {
    key: `waste:${item.articleId}`,
    id: item.articleId,
    kind: "waste",
    title: item.name,
    subtitle: item.category?.title ?? "Rác chuẩn",
    image: item.image,
    emoji: item.guidance.illustration.emoji,
  };
}

function mapArticle(item: Article, kind: "posts" | "knowledge"): SearchHit {
  return {
    key: `${kind}:${item.id}`,
    id: item.id,
    kind,
    title: item.title,
    subtitle:
      item.category?.title ??
      (kind === "posts" ? "Bài viết" : "Kiến thức môi trường"),
    image: item.image,
  };
}

function SearchResultRow({
  item,
  onPress,
}: {
  item: SearchHit;
  onPress: (item: SearchHit) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mở ${item.title}`}
      onPress={() => onPress(item)}
      className="min-h-[88px] flex-row items-center rounded-2xl border border-grey-100 bg-white p-3"
    >
      {item.image ? (
        <RemoteImage
          uri={item.image}
          style={{
            width: 68,
            height: 68,
            borderRadius: 12,
          }}
          contentFit="cover"
        />
      ) : (
        <View className="h-[68px] w-[68px] items-center justify-center rounded-xl bg-primary-50">
          {item.kind === "waste" && item.emoji ? (
            <Text className="text-3xl">{item.emoji}</Text>
          ) : (
            <DocumentText size={27} color="#159947" />
          )}
        </View>
      )}

      <View className="ml-3 flex-1">
        <Text
          className="text-sm font-bold leading-5 text-grey-900"
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <Text className="mt-2 text-xs text-grey-500" numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>

      <Text className="ml-2 text-xl text-grey-400">›</Text>
    </Pressable>
  );
}

function SearchPreviewSection({
  title,
  total,
  items,
  loading,
  error,
  onMore,
  onRetry,
  onOpen,
}: {
  title: string;
  total?: number;
  items: SearchHit[];
  loading: boolean;
  error: boolean;
  onMore: () => void;
  onRetry: () => void;
  onOpen: (item: SearchHit) => void;
}) {
  if (!loading && !error && items.length === 0) {
    return null;
  }

  return (
    <View className="mb-7">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-bold text-grey-900">{title}</Text>

          {typeof total === "number" && (
            <Text className="mt-1 text-xs text-grey-500">{total} kết quả</Text>
          )}
        </View>

        {items.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={onMore}
            className="min-h-11 justify-center pl-3"
          >
            <Text className="text-sm font-semibold text-primary-main">
              Xem tất cả →
            </Text>
          </Pressable>
        )}
      </View>

      {error && items.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="rounded-xl bg-grey-50 px-4 py-4"
        >
          <Text className="text-sm text-red-600">
            Không tải được {title.toLowerCase()}. Chạm để thử lại.
          </Text>
        </Pressable>
      ) : loading && items.length === 0 ? (
        <ActivityIndicator color="#159947" className="py-4" />
      ) : (
        <View className="gap-3">
          {items.slice(0, 3).map((item) => (
            <SearchResultRow key={item.key} item={item} onPress={onOpen} />
          ))}
        </View>
      )}
    </View>
  );
}

function SearchEmptyState({
  title,
  description,
  onReset,
}: {
  title: string;
  description: string;
  onReset?: () => void;
}) {
  return (
    <View className="items-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <SearchNormal1 size={28} color="#159947" />
      </View>

      <Text className="text-center text-lg font-bold text-grey-900">
        {title}
      </Text>

      <Text className="mt-2 text-center text-sm leading-6 text-grey-600">
        {description}
      </Text>

      {onReset && (
        <Pressable
          accessibilityRole="button"
          onPress={onReset}
          className="mt-5 rounded-xl bg-primary-50 px-5 py-3"
        >
          <Text className="font-semibold text-primary-main">
            Tìm từ khóa khác
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function SearchScreen() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const normalizedSearch = search.trim();

  const hasInput = normalizedSearch.length >= 2;
  const isTyping = hasInput && normalizedSearch !== keyword;

  const queries = useUnifiedSearch(keyword, scope);

  const wasteRows: SearchHit[] =
    queries.waste.data?.pages.flatMap((page) => page.data).map(mapWaste) ?? [];

  const postRows: SearchHit[] =
    queries.posts.data?.pages
      .flatMap((page) => page.data)
      .map((item) => mapArticle(item, "posts")) ?? [];

  const knowledgeRows: SearchHit[] =
    queries.knowledge.data?.pages
      .flatMap((page) => page.data)
      .map((item) => mapArticle(item, "knowledge")) ?? [];

  const wasteTotal = queries.waste.data?.pages[0]?.total;

  const postTotal = queries.posts.data?.pages[0]?.total;

  const knowledgeTotal = queries.knowledge.data?.pages[0]?.total;

  const activeQuery =
    scope === "waste"
      ? queries.waste
      : scope === "posts"
        ? queries.posts
        : queries.knowledge;

  const activeRows =
    scope === "waste"
      ? wasteRows
      : scope === "posts"
        ? postRows
        : knowledgeRows;

  const activeTotal =
    scope === "waste"
      ? wasteTotal
      : scope === "posts"
        ? postTotal
        : knowledgeTotal;

  const openResult = (item: SearchHit) => {
    Keyboard.dismiss();

    if (item.kind === "waste") {
      router.push({
        pathname: "/(protected)/waste-details/[id]",
        params: { id: item.id },
      });
      return;
    }

    router.push({
      pathname: "/(protected)/article-details/[id]",
      params: { id: item.id },
    });
  };

  const clearSearch = () => {
    setSearch("");
    setKeyword("");
  };

  const loadMore = () => {
    if (
      activeQuery.hasNextPage &&
      !activeQuery.isFetching &&
      !activeQuery.isError
    ) {
      void activeQuery.fetchNextPage();
    }
  };

  const allQueries = [queries.waste, queries.posts, queries.knowledge];

  const allLoading = allQueries.some((query) => query.isFetching);

  const allError = allQueries.some((query) => query.isError);

  const hasAnyResults =
    wasteRows.length > 0 || postRows.length > 0 || knowledgeRows.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Search header */}
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <View className="min-h-12 flex-1 flex-row items-center rounded-2xl border border-grey-200 bg-grey-50 px-3">
          <SearchNormal1 size={20} color="#919EAB" />

          <TextInput
            accessibilityLabel="Tìm kiếm toàn ứng dụng"
            autoFocus
            placeholder="Tìm rác, bài viết, kiến thức..."
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng tìm kiếm"
          onPress={() => router.back()}
          className="ml-3 min-h-11 justify-center"
        >
          <Text className="font-semibold text-grey-700">Hủy</Text>
        </Pressable>
      </View>

      {/* Search scopes */}
      <View className="pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
          }}
        >
          {SEARCH_TABS.map((tab) => {
            const selected = scope === tab.value;

            return (
              <Pressable
                key={tab.value}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected }}
                onPress={() => setScope(tab.value)}
                className={`mr-2 min-h-10 justify-center rounded-full border px-4 ${
                  selected
                    ? "border-primary-main bg-primary-main"
                    : "border-grey-200 bg-white"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selected ? "text-white" : "text-grey-700"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* No input: never display API results */}
      {!hasInput ? (
        <SearchEmptyState
          title="Bạn muốn tìm gì?"
          description="Nhập ít nhất 2 ký tự để tìm các loại rác, bài viết hoặc kiến thức môi trường."
        />
      ) : isTyping ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#159947" />
          <Text className="mt-3 text-sm text-grey-500">Đang tìm kiếm...</Text>
        </View>
      ) : scope === "all" ? (
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
          }}
        >
          <SearchPreviewSection
            title="Rác chuẩn"
            total={wasteTotal}
            items={wasteRows}
            loading={queries.waste.isPending}
            error={queries.waste.isError}
            onMore={() => setScope("waste")}
            onRetry={() => {
              void queries.waste.refetch();
            }}
            onOpen={openResult}
          />

          <SearchPreviewSection
            title="Bài viết"
            total={postTotal}
            items={postRows}
            loading={queries.posts.isPending}
            error={queries.posts.isError}
            onMore={() => setScope("posts")}
            onRetry={() => {
              void queries.posts.refetch();
            }}
            onOpen={openResult}
          />

          <SearchPreviewSection
            title="Kiến thức môi trường"
            total={knowledgeTotal}
            items={knowledgeRows}
            loading={queries.knowledge.isPending}
            error={queries.knowledge.isError}
            onMore={() => setScope("knowledge")}
            onRetry={() => {
              void queries.knowledge.refetch();
            }}
            onOpen={openResult}
          />

          {!allLoading && !allError && !hasAnyResults && (
            <SearchEmptyState
              title="Không tìm thấy kết quả"
              description="Thử sử dụng tên vật thể, tên chất liệu hoặc một từ khóa khác."
              onReset={clearSearch}
            />
          )}
        </ScrollView>
      ) : activeQuery.isPending && activeRows.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#159947" />
        </View>
      ) : (
        <FlatList
          data={activeRows}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 100,
            flexGrow: 1,
          }}
          refreshing={
            activeQuery.isRefetching && !activeQuery.isFetchingNextPage
          }
          onRefresh={() => {
            void activeQuery.refetch();
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={
            typeof activeTotal === "number" ? (
              <Text className="mb-4 text-sm text-grey-500">
                {activeTotal} kết quả
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <SearchResultRow item={item} onPress={openResult} />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            activeQuery.isError ? (
              <View>
                <SearchEmptyState
                  title="Không thể tải kết quả"
                  description="Đã xảy ra lỗi khi tìm kiếm. Hãy thử lại."
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void activeQuery.refetch();
                  }}
                  className="mx-8 items-center rounded-xl bg-primary-main px-5 py-3"
                >
                  <Text className="font-semibold text-white">Thử lại</Text>
                </Pressable>
              </View>
            ) : (
              <SearchEmptyState
                title="Không có kết quả"
                description="Không tìm thấy nội dung phù hợp với từ khóa này."
                onReset={clearSearch}
              />
            )
          }
          ListFooterComponent={
            activeQuery.isFetchNextPageError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void activeQuery.fetchNextPage();
                }}
                className="py-6"
              >
                <Text className="text-center text-red-600">
                  Không tải được trang tiếp. Thử lại.
                </Text>
              </Pressable>
            ) : activeQuery.isFetchingNextPage ? (
              <ActivityIndicator color="#159947" className="py-5" />
            ) : activeQuery.hasNextPage ? (
              <Pressable
                accessibilityRole="button"
                onPress={loadMore}
                className="py-5"
              >
                <Text className="text-center font-semibold text-primary-main">
                  Tải thêm
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
