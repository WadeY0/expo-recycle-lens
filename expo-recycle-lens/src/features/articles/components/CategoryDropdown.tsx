import { Category } from "@/features/waste-library/types/categories.types";
import { ArrowDown2, Category as CategoryIcon } from "iconsax-react-nativejs";
import React, { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isLoading?: boolean;
}

export const CategoryDropdown = ({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading = false,
}: CategoryDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedCategoryTitle = selectedCategory
    ? categories.find(cat => cat.id === selectedCategory)?.title
    : "Tất cả danh mục";

  const categoryItems = [
    { id: null, title: "Tất cả danh mục" },
    ...categories,
  ];

  return (
    <>
      <Pressable
        onPress={() => !isLoading && setIsOpen(true)}
        className="flex-row items-center justify-between bg-white border border-grey-200 rounded-2xl px-4 py-3 min-w-[140px]"
        disabled={isLoading}
      >
        <View className="flex-row items-center">
          <CategoryIcon size={18} color="#6B7280" />
          <Text 
            className="ml-2 text-sm font-medium text-grey-700" 
            numberOfLines={1}
          >
            {selectedCategoryTitle}
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
            <View className="px-6 py-4 border-b border-grey-100">
              <Text className="text-lg font-bold text-grey-900">
                Chọn danh mục
              </Text>
            </View>
            <FlatList
              data={categoryItems}
              keyExtractor={(item) => item.id || "all"}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelectCategory(item.id);
                    setIsOpen(false);
                  }}
                  className={`px-6 py-4 border-b border-grey-50 ${
                    selectedCategory === item.id ? "bg-green-50" : ""
                  }`}
                >
                  <Text
                    className={`text-base ${
                      selectedCategory === item.id
                        ? "font-semibold text-green-600"
                        : "font-medium text-grey-900"
                    }`}
                  >
                    {item.title}
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