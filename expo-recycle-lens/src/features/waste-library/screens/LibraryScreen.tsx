import { useRouter } from "expo-router";
import { ArrowLeft } from "iconsax-react-nativejs";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WasteBrowser } from "../components/WasteBrowser";

interface LibraryScreenProps {
  favorites?: boolean;
}

export function LibraryScreen({ favorites = false }: LibraryScreenProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Favorites navigation */}
      {favorites && (
        <View className="px-6 pt-3 pb-2">
          {/* Back */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            className="flex-row items-center self-start min-h-11"
          >
            <ArrowLeft size={22} color="#161C24" variant="Linear" />

            <Text className="ml-2 text-base font-medium text-grey-900">
              Quay lại
            </Text>
          </Pressable>

          {/* Other saved content */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem bài viết và kiến thức đã lưu"
            onPress={() => router.push("/(protected)/article-favorites")}
            className="mt-3 flex-row items-center justify-between rounded-2xl border border-grey-100 bg-grey-50 px-4 py-4"
          >
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-grey-900">
                Bài viết & kiến thức đã lưu
              </Text>

              <Text className="mt-1 text-xs leading-5 text-grey-600">
                Xem những nội dung bạn đã yêu thích
              </Text>
            </View>

            <Text className="text-xl font-bold text-primary-main">→</Text>
          </Pressable>
        </View>
      )}

      {/* Canonical Waste Library only */}
      <WasteBrowser
        title={favorites ? "Rác đã lưu" : "Thư viện rác"}
        favorites={favorites}
        embedded
      />
    </SafeAreaView>
  );
}
