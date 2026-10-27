import { emailSchema } from "../validator/auth.schema";
import { toApiError } from "@/shared/api/api-error";
import { AppButton } from "@/shared/components/ui/AppButton";
import { AppInput } from "@/shared/components/ui/AppInput";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { forgotPasswordAuth } from "../lib/auth-actions";
import { useAuthStore } from "../store/auth.store";
import Toast from "react-native-toast-message";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const isLoading = useAuthStore((state) => state.isLoading);

  const onSendRequest = async () => {
    if (isLoading) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      Toast.show({ type: "error", text1: parsed.error.issues[0].message });
      return;
    }
    try {
      const response = await forgotPasswordAuth({ email: parsed.data });
      Toast.show({
        type: "success",
        text1: "Kiểm tra email",
        text2: "Nếu tài khoản tồn tại, mã đặt lại mật khẩu đã được gửi.",
      });
      router.push({
        pathname: "/(public)/reset-password",
        params: { email: parsed.data, userId: response.userId },
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Lỗi",
        text2: toApiError(error).message,
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          {/* Back Button */}
          <View className="mt-4">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-grey-100"
            >
              <Ionicons name="chevron-back" size={24} color="#212B36" />
            </Pressable>
          </View>

          <View className="items-center py-12">
            <Text className="text-3xl font-bold text-grey-900">
              Quên mật khẩu
            </Text>
            <Text className="mt-4 text-center text-base leading-6 text-grey-400">
              Vui lòng nhập địa chỉ email được liên kết với tài khoản của bạn và
              chúng tôi sẽ gửi cho bạn mã xác xác nhận để đặt lại mật khẩu.
            </Text>
          </View>

          <View className="gap-6">
            <AppInput
              placeholder="Email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <AppButton
              label="Gửi yêu cầu"
              onPress={onSendRequest}
              loading={isLoading}
            />

            <Link href="/(public)/sign-in" asChild>
              <Pressable className="flex-row items-center justify-center gap-1 py-4">
                <Ionicons name="chevron-back" size={18} color="#212B36" />
                <Text className="text-sm font-semibold text-grey-900">
                  Quay lại đăng nhập
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
