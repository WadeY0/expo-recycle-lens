// src/app/+not-found.tsx
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-3xl font-bold mb-2">404</Text>

      <Text className="text-lg text-gray-600 text-center mb-6">
        Trang bạn đang tìm không tồn tại.
      </Text>

      <Pressable
        onPress={() => router.replace("/")}
        className="px-5 py-3 bg-black rounded-xl"
      >
        <Text className="text-white font-medium">Quay về trang chủ</Text>
      </Pressable>
    </View>
  );
}
