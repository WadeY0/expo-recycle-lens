import { useState } from "react";
import { useRouter } from "expo-router";
import { ArrowLeft } from "iconsax-react-nativejs";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuthStore } from "@/features/auth/store/auth.store";
import { signOutAuth } from "@/features/auth/lib/auth-actions";
import { toApiError } from "@/shared/api/api-error";
import { AppButton } from "@/shared/components/ui/AppButton";
import { AppInput } from "@/shared/components/ui/AppInput";

import { changePasswordApi } from "../api/change-password";
import { changePasswordSchema } from "../lib/profile-validation";

export function AccountSettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (pending) return;

    const parsed = changePasswordSchema.safeParse({
      oldPassword,
      newPassword,
      confirmPassword,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setPending(true);
    setError("");

    try {
      await changePasswordApi({
        oldPassword: parsed.data.oldPassword,
        newPassword: parsed.data.newPassword,
      });
    } catch (err) {
      setError(toApiError(err).message);
      setPending(false);
      return;
    }

    // Backend increments tokenVersion after
    // successfully changing the password.
    // Re-authentication is required.
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");

    Toast.show({
      type: "success",
      text1: "Đã cập nhật mật khẩu",
      text2: "Vui lòng đăng nhập lại.",
    });

    try {
      await signOutAuth();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Đã đổi mật khẩu",
        text2: "Không thể hoàn tất xóa phiên đăng nhập trên thiết bị.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center px-6 py-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            disabled={pending}
            className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-grey-100"
          >
            <ArrowLeft size={22} color="#161C24" />
          </Pressable>

          <Text className="flex-1 text-xl font-bold text-grey-900">
            Bảo mật tài khoản
          </Text>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 110,
          }}
        >
          {/* Account summary */}
          <View className="mt-4 rounded-2xl border border-grey-200 bg-grey-50 p-4">
            <Text className="text-xs font-semibold text-grey-500">
              EMAIL TÀI KHOẢN
            </Text>

            <Text
              className="mt-2 text-base font-semibold text-grey-900"
              selectable
            >
              {user?.email || "Chưa có thông tin"}
            </Text>
          </View>

          {/* Security section */}
          <View className="mt-8">
            <Text className="text-xl font-bold text-grey-900">
              Đổi mật khẩu
            </Text>

            <Text className="mt-2 text-sm leading-6 text-grey-600">
              Sử dụng mật khẩu mạnh để bảo vệ tài khoản RecycleLens của bạn.
            </Text>
          </View>

          {/* Password fields */}
          <View className="mt-6 gap-4">
            <AppInput
              label="Mật khẩu hiện tại"
              placeholder="Nhập mật khẩu hiện tại"
              value={oldPassword}
              onChangeText={(value) => {
                setOldPassword(value);
                setError("");
              }}
              secureTextEntry
            />

            <AppInput
              label="Mật khẩu mới"
              placeholder="Ít nhất 8 ký tự"
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                setError("");
              }}
              secureTextEntry
            />

            <AppInput
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setError("");
              }}
              secureTextEntry
            />

            {error ? (
              <View className="rounded-xl bg-red-50 p-3">
                <Text
                  accessibilityRole="alert"
                  className="text-sm text-red-600"
                >
                  {error}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Security explanation */}
          <View className="mt-6 rounded-2xl bg-primary-50 p-4">
            <Text className="text-sm font-bold text-grey-900">
              Lưu ý bảo mật
            </Text>

            <Text className="mt-2 text-sm leading-6 text-grey-700">
              Sau khi đổi mật khẩu thành công, bạn sẽ cần đăng nhập lại.
            </Text>

            <Text className="mt-2 text-sm leading-6 text-grey-600">
              Nếu đăng nhập bằng Google và chưa có mật khẩu, hãy sử dụng chức
              năng Quên mật khẩu tại màn hình đăng nhập.
            </Text>
          </View>

          {/* Submit */}
          <View className="mt-7">
            <AppButton
              label="Cập nhật mật khẩu"
              onPress={() => {
                void submit();
              }}
              loading={pending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
