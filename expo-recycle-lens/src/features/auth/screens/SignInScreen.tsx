import {
  handleGoogleSignIn,
  googleSignInRequirement,
} from "../lib/google-signin-helper";
import { toApiError } from "@/shared/api/api-error";
import { signInSchema } from "../validator/auth.schema";
import { AppButton } from "@/shared/components/ui/AppButton";
import { AppInput } from "@/shared/components/ui/AppInput";
import images from "@/shared/constants/images";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { signInAuth, hydrateAuth } from "../lib/auth-actions";
import { useAuthStore } from "../store/auth.store";

export function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isLoading = useAuthStore((state) => state.isLoading);

  const onSignIn = async () => {
    if (isLoading) return;
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      Toast.show({
        type: "error",
        text1: "Kiểm tra thông tin",
        text2: parsed.error.issues[0].message,
      });
      return;
    }

    try {
      const response = await signInAuth(parsed.data);

      if (response?.requiresVerification) return;

      Toast.show({
        type: "success",
        text1: "Đăng nhập thành công 👋",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Đăng nhập thất bại",
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
              onPress={() => router.replace("/(public)/onboarding")}
              className="h-10 w-10 items-center justify-center rounded-full bg-grey-100"
            >
              <Ionicons name="chevron-back" size={24} color="#212B36" />
            </Pressable>
          </View>

          {/* Illustration Placeholder */}
          <View className="items-center justify-center py-6">
            <Image source={images.login} className="w-40 h-40" />
          </View>

          <View className="gap-2 self-center pb-8">
            <Text className="text-3xl font-bold text-grey-900">Đăng nhập</Text>
          </View>

          <View className="gap-5">
            <AppInput
              placeholder="Email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <View>
              <AppInput
                placeholder="Mật khẩu"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Link href="/(public)/forgot-password" asChild>
                <Pressable className="mt-4 self-end">
                  <Text className="text-sm font-medium text-grey-600 underline">
                    Quên mật khẩu?
                  </Text>
                </Pressable>
              </Link>
            </View>

            <AppButton
              label="Đăng nhập"
              onPress={onSignIn}
              loading={isLoading}
            />

            <AppButton
              label="Thử khôi phục phiên"
              variant="secondary"
              disabled={isLoading}
              onPress={() => {
                useAuthStore.getState().setHydrated(false);
                void hydrateAuth();
              }}
            />
            <AppButton
              label="Đăng nhập với Google"
              variant="google"
              onPress={() => {
                void handleGoogleSignIn();
              }}
              disabled={isLoading}
              icon={<Ionicons name="logo-google" size={20} color="#919EAB" />}
            />
            {googleSignInRequirement() && (
              <Text className="text-sm text-grey-500">
                {googleSignInRequirement()}
              </Text>
            )}
          </View>

          <View className="mt-auto items-center py-8">
            <View className="flex-row items-center gap-1">
              <Text className="text-sm text-grey-500">
                Bạn cần một tài khoản?
              </Text>
              <Link href="/(public)/sign-up" asChild>
                <Pressable>
                  <Text className="text-sm font-bold text-grey-900 underline">
                    Đăng ký
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
