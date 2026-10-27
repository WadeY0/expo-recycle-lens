import { useState, useRef } from "react";
import {
  FlatList,
  Text,
  View,
  Dimensions,
  ImageBackground,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { AppButton } from "@/shared/components/ui/AppButton";
import { router } from "expo-router";
import { useAppStore } from "@/shared/store/app.store";
import images from "@/shared/constants/images";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "PHÂN LOẠI RÁC\nDỄ DÀNG",
    subtitle:
      "RecycleLens gợi ý nhận dạng để bạn tra hướng dẫn và kiểm tra quy định thu gom địa phương.",
    backgroundImage: images.ob1,
  },
  {
    id: "2",
    title: "NHẬN DIỆN RÁC\nBẰNG CAMERA",
    subtitle:
      "Kết quả AI có thể sai hoặc chưa chắc chắn. Không chạm vào vật nghi nguy hại; hãy tham khảo hướng dẫn đã đối chiếu.",
    backgroundImage: images.ob2,
  },
  {
    id: "3",
    title: "HIỂU HƠN\nVỀ RÁC THẢI",
    subtitle:
      "Khám phá kiến thức đơn giản giúp bạn xây dựng thói quen sống thân thiện với môi trường.",
    backgroundImage: images.ob3,
  },
];

export function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
      router.replace("/(public)/sign-in");
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        keyExtractor={(item) => item.id}
        className="flex-1"
        renderItem={({ item }) => (
          <ImageBackground
            source={item.backgroundImage}
            className="flex-1"
            style={{ width, height: "100%" }}
            resizeMode="cover"
          >
            <View className="flex-1 bg-black/10 px-6 pt-24">
              <Text className="text-4xl font-extrabold text-grey-900 leading-[44px]">
                {item.title}
              </Text>
              <Text className="mt-4 text-base font-medium text-grey-800 opacity-80 max-w-[80%] leading-6">
                {item.subtitle}
              </Text>
            </View>
          </ImageBackground>
        )}
      />

      <View className="absolute bottom-12 left-0 right-0 px-6">
        <AppButton
          label={
            currentIndex === SLIDES.length - 1 ? "Bắt đầu ngay!" : "Tiếp theo"
          }
          onPress={handleNext}
        />
      </View>
    </View>
  );
}
