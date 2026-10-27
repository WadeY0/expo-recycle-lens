import { RemoteImage } from "@/shared/components/ui/RemoteImage";
import { Heart } from "iconsax-react-nativejs";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";

import { useWasteFavorite } from "../lib/waste-hooks";
import type { WasteGuidance, WasteItem } from "../types/waste.types";

interface WasteGridCardProps {
  item: WasteItem;
  width: number;
  onPress: () => void;
}

const SHORT_RECYCLING_LABELS: Record<WasteGuidance["recycling"], string> = {
  conditional: "Tái chế tùy nơi",
  special_collection: "Thu gom riêng",
  not_curbside: "Không bỏ chung",
  compostable: "Có thể ủ hữu cơ",
};

export function WasteGridCard({ item, width, onPress }: WasteGridCardProps) {
  const favorite = useWasteFavorite();

  const hazardous = item.guidance.hazardous;

  const statusLabel = hazardous
    ? "Thu gom đặc biệt"
    : SHORT_RECYCLING_LABELS[item.guidance.recycling];

  const toggleFavorite = () => {
    favorite.mutate(
      {
        id: item.articleId,
        saved: !item.isFavorite,
      },
      {
        onError: () => {
          Toast.show({
            type: "error",
            text1: "Không thể cập nhật mục đã lưu",
          });
        },
      }
    );
  };

  return (
    <View
      style={{ width }}
      className="overflow-hidden rounded-2xl border border-grey-200 bg-white"
    >
      {/* Main card interaction */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem thông tin ${item.name}`}
        onPress={onPress}
      >
        {/* Thumbnail */}
        <View className="relative bg-grey-50">
          {item.image ? (
            <RemoteImage
              uri={item.image}
              style={{
                width: "100%",
                height: width * 0.74,
              }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{ height: width * 0.74 }}
              className="items-center justify-center"
            >
              <Text
                className="text-5xl"
                accessibilityLabel={item.guidance.illustration.alt}
              >
                {item.guidance.illustration.emoji}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="px-3 pt-3 pb-4">
          <Text
            className="min-h-10 text-sm font-bold leading-5 text-grey-900"
            numberOfLines={2}
          >
            {item.name}
          </Text>

          <Text className="mt-2 text-xs text-grey-600" numberOfLines={1}>
            {item.category?.title ?? "Chưa có danh mục"}
          </Text>

          {/* Recycling / Hazard */}
          <View className="mt-3 min-h-6 justify-center">
            <Text
              className={`text-xs font-semibold ${
                hazardous ? "text-red-600" : "text-primary-main"
              }`}
              numberOfLines={2}
            >
              {hazardous ? "⚠ " : ""}
              {statusLabel}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Separate favorite press target */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          item.isFavorite ? `Bỏ lưu ${item.name}` : `Lưu ${item.name}`
        }
        accessibilityState={{
          selected: item.isFavorite,
          disabled: favorite.isPending,
        }}
        disabled={favorite.isPending}
        onPress={toggleFavorite}
        className="absolute right-2 top-2 h-11 w-11 items-center justify-center rounded-full border border-grey-100 bg-white/95"
      >
        <Heart
          size={20}
          color={item.isFavorite ? "#EB5757" : "#637381"}
          variant={item.isFavorite ? "Bold" : "Linear"}
        />
      </Pressable>
    </View>
  );
}
