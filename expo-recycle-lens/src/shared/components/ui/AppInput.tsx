import { useState } from "react";
import {
  KeyboardTypeOptions,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AppInputProps = {
  label?: string;
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
};

export function AppInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  error,
}: AppInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="gap-2">
      {label && (
        <Text className="text-sm font-medium text-grey-800 dark:text-grey-200">
          {label}
        </Text>
      )}
      <View className="relative">
        <TextInput
          accessibilityLabel={label || placeholder}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          placeholderTextColor="#919EAB" // grey 500
          className={`min-h-14 rounded-2xl border bg-white px-4 text-base text-grey-900 ${
            error ? "border-secondary-main" : "border-grey-300"
          }`}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-4"
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={22}
              color="#919EAB" // grey 500
            />
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="text-xs font-medium text-secondary-main">{error}</Text>
      )}
    </View>
  );
}
