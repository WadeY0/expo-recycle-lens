import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { WasteFilters } from "../types/waste.types";

interface WasteMaterialFilterSheetProps {
  visible: boolean;
  materials: WasteFilters["materials"];
  selectedMaterial?: string;
  onClose: () => void;
  onApply: (materialId?: string) => void;
}

export function WasteMaterialFilterSheet({
  visible,
  materials,
  selectedMaterial,
  onClose,
  onApply,
}: WasteMaterialFilterSheetProps) {
  const { height } = useWindowDimensions();

  // Draft selection only changes the API query
  // when the user presses Apply.
  const [draftMaterial, setDraftMaterial] = useState<string | undefined>(
    selectedMaterial
  );

  useEffect(() => {
    if (visible) {
      setDraftMaterial(selectedMaterial);
    }
  }, [visible, selectedMaterial]);

  const apply = () => {
    onApply(draftMaterial);
  };

  const options = [
    {
      id: undefined,
      name: "Tất cả chất liệu",
    },
    ...materials,
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng bộ lọc chất liệu"
          onPress={onClose}
          className="absolute inset-0 bg-black/40"
        />

        {/* Bottom sheet */}
        <SafeAreaView
          edges={["bottom"]}
          style={{
            maxHeight: height * 0.76,
          }}
          className="rounded-t-3xl bg-white"
        >
          <View className="border-b border-grey-100 px-6 pt-5 pb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-grey-900">
                Chọn chất liệu
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={onClose}
                className="min-h-11 min-w-11 items-end justify-center"
              >
                <Text className="text-sm font-semibold text-grey-600">
                  Đóng
                </Text>
              </Pressable>
            </View>

            <Text className="mt-1 text-sm text-grey-500">
              Lọc danh sách theo chất liệu của vật thể.
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            {options.map((option) => {
              const selected = draftMaterial === option.id;

              return (
                <Pressable
                  key={option.id ?? "all"}
                  accessibilityRole="radio"
                  accessibilityLabel={option.name}
                  accessibilityState={{
                    checked: selected,
                  }}
                  onPress={() => setDraftMaterial(option.id)}
                  className="min-h-14 flex-row items-center justify-between border-b border-grey-100 py-3"
                >
                  <Text
                    className={`flex-1 pr-4 text-base ${
                      selected
                        ? "font-semibold text-primary-main"
                        : "text-grey-800"
                    }`}
                  >
                    {option.name}
                  </Text>

                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                      selected ? "border-primary-main" : "border-grey-400"
                    }`}
                  >
                    {selected && (
                      <View className="h-2.5 w-2.5 rounded-full bg-primary-main" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Actions */}
          <View className="flex-row gap-3 border-t border-grey-100 px-6 pt-4 pb-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa bộ lọc chất liệu"
              onPress={() => setDraftMaterial(undefined)}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-grey-200 bg-white"
            >
              <Text className="font-semibold text-grey-700">Xóa lọc</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Áp dụng bộ lọc"
              onPress={apply}
              className="min-h-12 flex-[1.5] items-center justify-center rounded-2xl bg-primary-main"
            >
              <Text className="font-semibold text-white">Áp dụng</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
