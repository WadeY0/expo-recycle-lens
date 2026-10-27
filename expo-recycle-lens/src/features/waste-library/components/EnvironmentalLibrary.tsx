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
import { router } from "expo-router";
import { useLibraryKnowledge } from "@/features/articles/lib/article-hooks";
import { WasteCardWithFavorite } from "@/features/articles/components/WasteCardWithFavorite";
import { CategoryTab } from "@/features/home/components/HomeScreenComponents";
import { useCategories } from "../lib/category-hooks";
export function EnvironmentalLibrary({
  favorites = false,
}: {
  favorites?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<string>();
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const categories = useCategories({
    type: "library",
    status: "active",
    perPage: 100,
  });
  const pages = useLibraryKnowledge({ keyword, categoryId }, favorites);
  return (
    <View className="flex-1 bg-white">
      <Text className="text-grey-600 mx-6 my-3">
        Nội dung thư viện hiện hữu được giữ nguyên. Các mục này chưa có phân
        loại rác chuẩn hoặc bộ lọc chất liệu.
      </Text>
      <TextInput
        accessibilityLabel="Tìm kiến thức môi trường"
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm kiến thức môi trường..."
        className="mx-6 p-4 rounded-2xl bg-grey-50 mb-3"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        className="px-6 mb-3"
      >
        <CategoryTab
          label="Tất cả"
          active={!categoryId}
          onPress={() => setCategoryId(undefined)}
        />
        {categories.data?.data.map((c) => (
          <CategoryTab
            key={c.id}
            label={c.title}
            active={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
          />
        ))}
      </ScrollView>
      {pages.isLoading ? (
        <ActivityIndicator />
      ) : pages.error ? (
        <Pressable
          onPress={() => {
            void pages.refetch();
          }}
        >
          <Text className="text-red-600 p-6">
            Không tải được nội dung. Chạm để thử lại.
          </Text>
        </Pressable>
      ) : (
        <FlatList
          data={pages.data?.pages.flatMap((p) => p.data) ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{
            paddingHorizontal: 24,
            justifyContent: "space-between",
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
          onEndReached={() => {
            if (pages.hasNextPage && !pages.isFetchingNextPage)
              void pages.fetchNextPage();
          }}
          renderItem={({ item }) => (
            <WasteCardWithFavorite
              item={{
                id: item.id,
                title: item.title,
                image: item.image ?? "",
                isFavorite: item.isLiked,
                status: item.category?.title,
              }}
              onPress={() =>
                router.push({
                  pathname: "/(protected)/waste-details/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          ListEmptyComponent={
            <Text className="text-grey-500 text-center p-8">
              Không có nội dung môi trường phù hợp bộ lọc.
            </Text>
          }
          ListFooterComponent={
            pages.isFetchingNextPage ? <ActivityIndicator /> : null
          }
        />
      )}
    </View>
  );
}
