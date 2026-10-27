import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowDown2,
  ArrowLeft,
  CloseCircle,
  Heart,
  SearchNormal1,
} from "iconsax-react-nativejs";
import { SafeAreaView } from "react-native-safe-area-context";

import { useWasteFilters, useWastePages } from "../lib/waste-hooks";

import { WasteGridCard } from "./WasteGridCard";
import { WasteMaterialFilterSheet } from "./WasteMaterialFilterSheet";

interface WasteBrowserProps {
  favorites?: boolean;
  title: string;
  initialSearch?: string;
  embedded?: boolean;
}

function CategoryChip({
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
      className={`mr-2 min-h-10 justify-center rounded-full border px-4 py-2 ${
        selected
          ? "border-primary-main bg-primary-main"
          : "border-grey-200 bg-white"
      }`}
    >
      <Text
        className={`text-sm font-semibold ${
          selected ? "text-white" : "text-grey-600"
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function WasteBrowser({
  favorites = false,
  title,
  initialSearch = "",
  embedded = false,
}: WasteBrowserProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // ====================================
  // SEARCH AND FILTER STATE
  // ====================================

  const [search, setSearch] = useState(initialSearch);

  const [keyword, setKeyword] = useState(initialSearch.trim());

  const [categoryId, setCategoryId] = useState<string | undefined>();

  const [material, setMaterial] = useState<string | undefined>();

  const [materialSheetOpen, setMaterialSheetOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // ====================================
  // SERVER DATA
  // ====================================

  const filters = useWasteFilters();

  const pages = useWastePages(
    {
      keyword: keyword || undefined,
      categoryId,
      material,
      perPage: 12,
    },
    favorites
  );

  const categories = filters.data?.categories ?? [];

  const materials = filters.data?.materials ?? [];

  const rows = pages.data?.pages.flatMap((page) => page.data) ?? [];

  const total = pages.data?.pages[0]?.total;

  const selectedMaterialName = materials.find(
    (item) => item.id === material
  )?.name;

  // 20px left + 20px right + 12px column gap
  const cardWidth = Math.max(1, (width - 52) / 2);

  const hasActiveFilters = !!categoryId || !!material;

  // ====================================
  // ACTIONS
  // ====================================

  const clearSearch = () => {
    setSearch("");
    setKeyword("");
  };

  const clearFilters = () => {
    setCategoryId(undefined);
    setMaterial(undefined);
  };

  const refresh = () => {
    void pages.refetch();
    void filters.refetch();
  };

  const loadMore = () => {
    if (pages.hasNextPage && !pages.isFetching && !pages.isError) {
      void pages.fetchNextPage();
    }
  };

  const openDetail = (articleId: string) => {
    router.push({
      pathname: "/(protected)/waste-details/[id]",
      params: {
        id: articleId,
      },
    });
  };

  const showInitialLoading = pages.isPending && rows.length === 0;

  const showInitialError = pages.isError && rows.length === 0;

  const showEmpty = !pages.isPending && !pages.isError && rows.length === 0;

  // ====================================
  // RENDER
  // ====================================

  return (
    <SafeAreaView className="flex-1 bg-white" edges={embedded ? [] : ["top"]}>
      {/* ================================= */}
      {/* HEADER                            */}
      {/* ================================= */}

      <View className="flex-row items-center px-5 pt-4 pb-3">
        {favorites && !embedded && (
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
            {title}
          </Text>

          {!favorites && (
            <Text className="mt-1 text-xs text-grey-500">
              Tra cứu các loại rác và cách xử lý.
            </Text>
          )}
        </View>

        {!favorites && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở danh sách rác đã lưu"
            onPress={() => router.push("/(protected)/favorites")}
            className="ml-3 h-11 w-11 items-center justify-center rounded-full bg-grey-100"
          >
            <Heart size={22} color="#161C24" />
          </Pressable>
        )}
      </View>

      {/* ================================= */}
      {/* SEARCH                            */}
      {/* ================================= */}

      <View className="px-5 pb-4">
        <View className="min-h-12 flex-row items-center rounded-2xl border border-grey-200 bg-grey-50 px-3">
          <SearchNormal1 size={20} color="#919EAB" />

          <TextInput
            accessibilityLabel="Tìm kiếm trong thư viện rác"
            placeholder="Tìm chai nhựa, pin, giấy..."
            placeholderTextColor="#919EAB"
            value={search}
            onChangeText={setSearch}
            maxLength={200}
            autoCorrect={false}
            returnKeyType="search"
            className="ml-3 min-h-12 flex-1 text-sm text-grey-900"
          />

          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa tìm kiếm"
              onPress={clearSearch}
              className="h-10 w-10 items-center justify-center"
            >
              <CloseCircle size={19} color="#919EAB" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ================================= */}
      {/* CATEGORY + MATERIAL FILTER        */}
      {/* ================================= */}

      <View className="flex-row items-center pb-3">
        {/* Category chips */}
        <ScrollView
          horizontal
          style={{ flex: 1 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingLeft: 20,
            paddingRight: 8,
          }}
        >
          <CategoryChip
            label="Tất cả"
            selected={!categoryId}
            onPress={() => setCategoryId(undefined)}
          />

          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              label={category.title}
              selected={categoryId === category.id}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </ScrollView>

        {/* Material filter */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lọc theo chất liệu"
          accessibilityState={{
            selected: !!material,
          }}
          onPress={() => setMaterialSheetOpen(true)}
          className={`mr-5 min-h-10 flex-row items-center rounded-xl border px-3 ${
            material
              ? "border-primary-main bg-primary-50"
              : "border-grey-200 bg-white"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              material ? "text-primary-main" : "text-grey-700"
            }`}
          >
            Chất liệu
          </Text>

          <ArrowDown2
            size={15}
            color={material ? "#159947" : "#637381"}
            style={{ marginLeft: 5 }}
          />
        </Pressable>
      </View>

      {/* Filter data errors should not hide results */}
      {filters.isError && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void filters.refetch();
          }}
          className="mx-5 mb-3 rounded-xl bg-grey-50 px-3 py-3"
        >
          <Text className="text-sm text-red-600">
            Không tải được danh mục và chất liệu. Chạm để thử lại.
          </Text>
        </Pressable>
      )}

      {filters.isPending && (
        <ActivityIndicator color="#159947" className="mb-3" />
      )}

      {/* ================================= */}
      {/* ACTIVE FILTER SUMMARY             */}
      {/* ================================= */}

      {material && (
        <View className="flex-row items-center justify-between px-5 pb-3">
          <View className="min-w-0 flex-1 flex-row items-center">
            <Text
              className="mr-2 flex-shrink text-xs text-primary-main"
              numberOfLines={1}
            >
              {selectedMaterialName ?? "Chất liệu đã chọn"}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa lọc chất liệu"
              onPress={() => setMaterial(undefined)}
              className="h-9 w-9 items-center justify-center"
            >
              <CloseCircle size={18} color="#159947" />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={clearFilters}
            className="min-h-10 justify-center pl-3"
          >
            <Text className="text-xs font-semibold text-grey-600">
              Xóa bộ lọc
            </Text>
          </Pressable>
        </View>
      )}

      {/* ================================= */}
      {/* RESULTS HEADER                    */}
      {/* ================================= */}

      <View className="flex-row items-center justify-between px-5 pb-3">
        <Text className="text-sm font-bold text-grey-900">
          Danh sách loại rác
        </Text>

        {typeof total === "number" && (
          <Text className="text-xs text-grey-500">{total} mục</Text>
        )}
      </View>

      {/* ================================= */}
      {/* LIST CONTENT                      */}
      {/* ================================= */}

      {showInitialLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#159947" />
          <Text className="mt-3 text-sm text-grey-500">
            Đang tải thư viện...
          </Text>
        </View>
      ) : showInitialError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-grey-700">
            Không thể tải thư viện rác.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void pages.refetch();
            }}
            className="mt-4 rounded-xl bg-primary-main px-5 py-3"
          >
            <Text className="font-semibold text-white">Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.slug}
          numColumns={2}
          columnWrapperStyle={{
            gap: 12,
            paddingHorizontal: 20,
          }}
          contentContainerStyle={{
            paddingTop: 4,
            paddingBottom: 110,
            flexGrow: 1,
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          renderItem={({ item }) => (
            <WasteGridCard
              item={item}
              width={cardWidth}
              onPress={() => openDetail(item.articleId)}
            />
          )}
          refreshing={pages.isRefetching && !pages.isFetchingNextPage}
          onRefresh={refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            showEmpty ? (
              <View className="items-center px-8 py-14">
                <Text className="text-center text-lg font-bold text-grey-900">
                  Không tìm thấy loại rác
                </Text>

                <Text className="mt-2 text-center text-sm leading-6 text-grey-600">
                  {keyword || hasActiveFilters
                    ? "Hãy thử từ khóa hoặc bộ lọc khác."
                    : favorites
                      ? "Bạn chưa lưu loại rác nào."
                      : "Thư viện hiện chưa có nội dung."}
                </Text>

                {(keyword || hasActiveFilters) && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      clearSearch();
                      clearFilters();
                    }}
                    className="mt-5 rounded-xl bg-primary-50 px-5 py-3"
                  >
                    <Text className="font-semibold text-primary-main">
                      Xóa tìm kiếm và bộ lọc
                    </Text>
                  </Pressable>
                )}

                {favorites && !keyword && !hasActiveFilters && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/(protected)/(tabs)/library")}
                    className="mt-5 rounded-xl bg-primary-main px-5 py-3"
                  >
                    <Text className="font-semibold text-white">
                      Khám phá thư viện
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
          ListFooterComponent={
            pages.isFetchNextPageError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void pages.fetchNextPage();
                }}
                className="px-6 py-6"
              >
                <Text className="text-center text-red-600">
                  Không tải được trang tiếp theo. Chạm để thử lại.
                </Text>
              </Pressable>
            ) : pages.isFetchingNextPage ? (
              <ActivityIndicator color="#159947" className="py-6" />
            ) : pages.isError && rows.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void pages.refetch();
                }}
                className="px-6 py-6"
              >
                <Text className="text-center text-red-600">
                  Không cập nhật được danh sách. Thử lại.
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}

      {/* ================================= */}
      {/* MATERIAL BOTTOM SHEET             */}
      {/* ================================= */}

      <WasteMaterialFilterSheet
        visible={materialSheetOpen}
        materials={materials}
        selectedMaterial={material}
        onClose={() => setMaterialSheetOpen(false)}
        onApply={(selected) => {
          setMaterial(selected);
          setMaterialSheetOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
