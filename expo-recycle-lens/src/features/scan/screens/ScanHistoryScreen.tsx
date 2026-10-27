import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft } from "iconsax-react-nativejs";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteVisionHistory } from "../lib/vision-hooks";

export function ScanHistoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteVisionHistory();

  useFocusEffect(
    useCallback(() => {
      void queryClient.resetQueries({
        queryKey: ["vision", "history", "infinite"],
      });
    }, [queryClient]),
  );

  const history = data?.pages.flatMap((page) => page.data) ?? [];
  const labels = {
    recognized: "AI đã nhận dạng · chưa có mục thư viện",
    matched: "Đã khớp thư viện",
    uncertain: "Chưa chắc chắn",
    unknown: "Chưa nhận diện",
    hazardous: "Có thể nguy hại",
  };

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !error) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, error]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 relative">
        <Pressable
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-2xl bg-grey-100 z-10"
        >
          <ArrowLeft size={24} color="#161C24" variant="Linear" />
        </Pressable>
        <View className="absolute inset-x-0 bottom-0 top-0 items-center justify-center -z-0">
          <Text className="text-xl font-bold text-grey-900">
            Lịch sử tra cứu
          </Text>
        </View>
        <View className="w-12" />
      </View>

      {error ? (
        <Pressable
          onPress={() => {
            void refetch();
          }}
        >
          <Text className="text-red-600 mx-6">
            Không tải được lịch sử. Chạm để thử lại.
          </Text>
        </Pressable>
      ) : isLoading ? (
        <ActivityIndicator className="flex-1" />
      ) : (
        <FlatList
          data={history}
          refreshing={false}
          onRefresh={() => {
            void refetch();
          }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="mx-6 mb-4 p-4 rounded-2xl bg-grey-50 border border-grey-100">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xem kết quả ${item.title}`}
                onPress={() =>
                  router.push(`/(protected)/scan-result/${item.id}`)
                }
                className="py-2"
              >
                <Text className="text-base font-bold text-grey-800">
                  {item.title || "Kết quả phân tích"}
                </Text>
                <Text className="text-sm text-grey-500 mt-1">
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </Text>
                <Text className="text-sm text-grey-600 mt-2">
                  {item.classification
                    ? labels[item.classification.status]
                    : "Kết quả cũ · chưa có phân loại chuẩn"}
                </Text>
              </Pressable>
              {item.classification?.articleId && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/(protected)/waste-details/[id]",
                      params: { id: item.classification!.articleId! },
                    })
                  }
                  className="py-3"
                >
                  <Text className="text-primary-main font-semibold">
                    Thư viện: {item.classification.wasteName}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-grey-400 italic">
                Chưa có lịch sử tra cứu
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
