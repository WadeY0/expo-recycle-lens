import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "iconsax-react-nativejs";
import { useRouter } from "expo-router";

export function AboutScreen() {
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
            Giới thiệu
          </Text>
        </View>
        <View className="w-12" />
      </View>

      <ScrollView className="flex-1 px-6 pb-20" showsVerticalScrollIndicator={false}>
        <View className="py-6">
          <Text className="text-base text-grey-800 leading-7 mb-6">
            <Text className="font-bold">GreenLens</Text> là ứng dụng di động giúp người dùng 
            <Text className="font-bold"> nhận diện và phân loại rác thải một cách nhanh chóng bằng công nghệ AI.</Text> Chỉ cần chụp ảnh rác bằng camera điện thoại, ứng dụng sẽ phân tích và cho biết loại rác, cách xử lý cũng như hướng dẫn phân loại phù hợp.
          </Text>

          <Text className="text-base text-grey-800 leading-7 mb-6">
            GreenLens được thiết kế để <Text className="font-bold">giúp mọi người dễ dàng thực hành phân loại rác trong cuộc sống hằng ngày</Text>, từ đó góp phần giảm ô nhiễm và bảo vệ môi trường.
          </Text>

          <Text className="text-base text-grey-800 leading-7 mb-6">
            Ngoài tính năng quét rác thông minh, ứng dụng còn cung cấp <Text className="font-bold">thư viện các loại rác phổ biến và các bài viết kiến thức về môi trường</Text>, giúp người dùng hiểu rõ hơn về tái chế, xử lý rác và lối sống bền vững.
          </Text>

          <Text className="text-base text-grey-800 leading-7 mb-6">
            Với giao diện đơn giản và thân thiện, GreenLens phù hợp cho <Text className="font-bold">học sinh, gia đình và cộng đồng đô thị</Text> muốn xây dựng thói quen sống xanh mỗi ngày.
          </Text>

          <Text className="text-lg font-bold text-grey-900">
            GreenLens – giúp bạn phân loại rác đúng cách chỉ với một bức ảnh
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
