import { ArrowDown2, Sort } from "iconsax-react-nativejs";
import React, { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";

export type SortOption = "title_asc" | "title_desc" | "latest" | "oldest";

interface SortDropdownProps {
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const SortDropdown = ({
  selectedSort,
  onSortChange,
}: SortDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    {
      key: "latest" as SortOption,
      label: "Mới nhất",
      description: "Bài viết được tạo gần đây nhất",
    },
    {
      key: "oldest" as SortOption,
      label: "Cũ nhất", 
      description: "Bài viết được tạo lâu nhất",
    },
    {
      key: "title_asc" as SortOption,
      label: "Tên A-Z",
      description: "Sắp xếp theo tên từ A đến Z",
    },
    {
      key: "title_desc" as SortOption,
      label: "Tên Z-A",
      description: "Sắp xếp theo tên từ Z đến A",
    },
  ];

  const selectedSortLabel = sortOptions.find(option => option.key === selectedSort)?.label || "Mới nhất";

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="flex-row items-center justify-between bg-white border border-grey-200 rounded-2xl px-4 py-3 min-w-[120px]"
      >
        <View className="flex-row items-center">
          <Sort size={18} color="#6B7280" />
          <Text 
            className="ml-2 text-sm font-medium text-grey-700" 
            numberOfLines={1}
          >
            {selectedSortLabel}
          </Text>
        </View>
        <ArrowDown2 
          size={16} 
          color="#6B7280" 
          style={{ 
            transform: [{ rotate: isOpen ? '180deg' : '0deg' }] 
          }} 
        />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setIsOpen(false)}
        >
          <View className="bg-white rounded-3xl max-h-96 w-full max-w-sm">
            <View className="px-6 py-4">
              <Text className="text-lg font-bold text-grey-900">
                Sắp xếp theo
              </Text>
            </View>
            <FlatList
              data={sortOptions}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSortChange(item.key);
                    setIsOpen(false);
                  }}
                  className={`px-6 py-4 ${
                    selectedSort === item.key ? "bg-green-50" : ""
                  }`}
                >
                  <Text
                    className={`text-base mb-1 ${
                      selectedSort === item.key
                        ? "font-semibold text-green-600"
                        : "font-medium text-grey-900"
                    }`}
                  >
                    {item.label}
                  </Text>
                  <Text className="text-sm text-grey-500">
                    {item.description}
                  </Text>
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};