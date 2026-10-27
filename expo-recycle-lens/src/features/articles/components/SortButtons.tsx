import React from "react";
import { Pressable, Text, View } from "react-native";
import { ArrowDown, ArrowUp, Sort } from "iconsax-react-nativejs";

export type SortOption = "title_asc" | "title_desc" | "latest" | "oldest";

interface SortButtonsProps {
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const SortButtons = ({ selectedSort, onSortChange }: SortButtonsProps) => {
  const sortOptions = [
    {
      key: "latest" as SortOption,
      label: "Mới nhất",
      icon: <ArrowDown size={14} color="#6B7280" />,
    },
    {
      key: "oldest" as SortOption,
      label: "Cũ nhất",
      icon: <ArrowUp size={14} color="#6B7280" />,
    },
    {
      key: "title_asc" as SortOption,
      label: "A-Z",
      icon: <Sort size={14} color="#6B7280" />,
    },
    {
      key: "title_desc" as SortOption,
      label: "Z-A",
      icon: <Sort size={14} color="#6B7280" style={{ transform: [{ scaleY: -1 }] }} />,
    },
  ];

  return (
    <View className="flex-row gap-2">
      {sortOptions.map((option) => (
        <Pressable
          key={option.key}
          onPress={() => onSortChange(option.key)}
          className={`flex-row items-center px-3 py-2 rounded-xl border ${
            selectedSort === option.key
              ? "bg-green-50 border-green-200"
              : "bg-white border-grey-200"
          }`}
        >
          {option.icon}
          <Text
            className={`ml-1 text-xs font-medium ${
              selectedSort === option.key
                ? "text-green-700"
                : "text-grey-700"
            }`}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};