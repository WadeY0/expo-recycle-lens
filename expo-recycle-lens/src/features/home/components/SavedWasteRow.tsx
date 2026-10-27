import { RemoteImage } from "@/shared/components/ui/RemoteImage";
import { Heart } from "iconsax-react-nativejs";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";

import { useWasteFavorite } from "@/features/waste-library/lib/waste-hooks";
import type { WasteItem } from "@/features/waste-library/types/waste.types";

interface SavedWasteRowProps {
  item: WasteItem;
  onPress: () => void;
}

export function SavedWasteRow({ item, onPress }: SavedWasteRowProps) {
  const favorite = useWasteFavorite();

  const removeFavorite = () => {
    favorite.mutate(
      {
        id: item.articleId,
        saved: false,
      },
      {
        onError: () => {
          Toast.show({
            type: "error",
            text1: "Không thể bỏ lưu nội dung",
          });
        },
      }
    );
  };

  return (
    <View className="flex-row items-center rounded-2xl border border-grey-200 bg-white p-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem ${item.name}`}
        onPress={onPress}
        className="flex-1 flex-row items-center"
      >
        {item.image ? (
          <RemoteImage
            uri={item.image}
            style={{
              width: 96,
              height: 96,
              borderRadius: 12,
            }}
            contentFit="cover"
          />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-xl bg-grey-50">
            <Text
              className="text-4xl"
              accessibilityLabel={item.guidance.illustration.alt}
            >
              {item.guidance.illustration.emoji}
            </Text>
          </View>
        )}

        <View className="ml-3 flex-1">
          <Text
            className="text-sm font-bold leading-5 text-grey-900"
            numberOfLines={2}
          >
            {item.name}
          </Text>

          <Text className="mt-2 text-xs text-grey-600" numberOfLines={1}>
            {item.category?.title ?? "Rác chuẩn"}
          </Text>

          {item.guidance.hazardous && (
            <Text className="mt-2 text-xs font-semibold text-red-600">
              Thu gom đặc biệt
            </Text>
          )}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Bỏ lưu ${item.name}`}
        accessibilityState={{
          disabled: favorite.isPending,
        }}
        disabled={favorite.isPending}
        onPress={removeFavorite}
        className="ml-1 h-11 w-11 items-center justify-center"
      >
        <Heart size={21} color="#EB5757" variant="Bold" />
      </Pressable>
    </View>
  );
}
