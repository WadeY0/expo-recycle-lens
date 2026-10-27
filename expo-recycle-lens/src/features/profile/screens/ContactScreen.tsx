import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "iconsax-react-nativejs";
import { useRouter } from "expo-router";

export function ContactScreen() {
  const router = useRouter();

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
            Liên hệ hỗ trợ
          </Text>
        </View>
        <View className="w-12" />
      </View>

      <View className="px-6 py-10">
        <Text className="text-base text-grey-700 leading-7 mb-8">
          Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn để hành trình phân loại rác trở nên dễ dàng và hiệu quả hơn.
        </Text>

        <View className="bg-grey-50 p-6 rounded-[32px] border border-grey-100">
          <View className="flex-row mb-4">
            <Text className="text-grey-400 mr-2">•</Text>
            <View className="flex-row flex-1">
              <Text className="text-grey-700 font-medium">Email hỗ trợ: </Text>
              <Text className="text-grey-500">example@gmail.com</Text>
            </View>
          </View>
          <View className="flex-row">
            <Text className="text-grey-400 mr-2">•</Text>
            <View className="flex-row flex-1">
              <Text className="text-grey-700 font-medium">Điện thoại (giờ hành chính): </Text>
              <Text className="text-grey-500">+84 9xx xxx xxx</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
