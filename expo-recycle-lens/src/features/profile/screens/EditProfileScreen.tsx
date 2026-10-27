import { getSessionAttempt } from "@/features/auth/lib/session-generation";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { RemoteImage } from "@/shared/components/ui/RemoteImage";
import { toApiError } from "@/shared/api/api-error";
import { profileSchema } from "../lib/profile-validation";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowLeft, Camera } from "iconsax-react-nativejs";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUpdateProfile, useUploadAvatar } from "../lib/profile-hooks";
import Toast from "react-native-toast-message";

export function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [age, setAge] = useState(user?.age?.toString() ?? "");
  const [formError, setFormError] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(
    user?.avatar || null,
  );

  const { mutate: updateProfile, isPending: isUpdatingProfile } =
    useUpdateProfile();
  const { mutate: uploadAvatar, isPending: isUploadingAvatar } =
    useUploadAvatar();

  useEffect(() => {
    if (user) {
      setPreviewImage(user.avatar || null);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      setFullName((current) => current || user.fullName);
    }
  }, [user]);

  const onPickImage = async () => {
    if (isUpdatingProfile || isUploadingAvatar) return;
    const sessionAttempt = getSessionAttempt();
    setFormError("");
    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted)
          throw new Error("Cần quyền chọn ảnh để cập nhật avatar.");
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      if (sessionAttempt !== getSessionAttempt()) return;
      const asset = result.assets[0];
      setPreviewImage(asset.uri);
      uploadAvatar(
        {
          sessionAttempt,
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          file: asset.file,
        },
        {
          onSuccess: () => {
            if (sessionAttempt === getSessionAttempt())
              Toast.show({ type: "success", text1: "Đã cập nhật avatar" });
          },
          onError: (error) => {
            if (sessionAttempt !== getSessionAttempt()) return;
            setPreviewImage(useAuthStore.getState().user?.avatar ?? null);
            setFormError(toApiError(error).message);
          },
        },
      );
    } catch (error) {
      if (sessionAttempt === getSessionAttempt())
        setFormError(toApiError(error).message);
    }
  };
  const onSave = () => {
    if (isUpdatingProfile || isUploadingAvatar) return;
    const result = profileSchema.safeParse({
      fullName,
      age: age.trim() ? Number(age) : null,
    });
    if (!result.success) {
      setFormError(result.error.issues[0].message);
      return;
    }
    setFormError("");
    updateProfile(result.data, {
      onSuccess: () => Toast.show({ type: "success", text1: "Đã lưu hồ sơ" }),
      onError: (error) => setFormError(toApiError(error).message),
    });
  };

  const isLoading = isUpdatingProfile || isUploadingAvatar;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 relative">
          <Pressable
            onPress={() => router.back()}
            disabled={isLoading}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-grey-100 z-10"
          >
            <ArrowLeft size={24} color="#161C24" variant="Linear" />
          </Pressable>
          <View className="absolute inset-x-0 bottom-0 top-0 items-center justify-center -z-0">
            <Text className="text-xl font-bold text-grey-900">
              Chỉnh sửa hồ sơ
            </Text>
          </View>
          <Pressable
            onPress={onSave}
            disabled={isLoading}
            className="h-12 px-4 items-center justify-center"
          >
            {isUpdatingProfile ? (
              <ActivityIndicator color="#00A86B" />
            ) : (
              <Text className="text-base font-bold text-primary-main">Lưu</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 px-6 py-10"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-10">
            {/* Avatar with Camera Icon */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn ảnh đại diện"
              onPress={onPickImage}
              className="relative"
              disabled={isLoading}
            >
              <RemoteImage
                uri={previewImage}
                style={{ width: 160, height: 160, borderRadius: 80 }}
              />
              <View className="absolute bottom-2 right-2 h-10 w-10 bg-white rounded-full items-center justify-center border border-grey-100 shadow-sm">
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#919EAB" />
                ) : (
                  <Camera size={20} color="#919EAB" variant="Linear" />
                )}
              </View>
            </Pressable>
          </View>

          {/* Form */}
          <View className="w-full">
            {formError ? (
              <Text accessibilityRole="alert" className="text-red-600 mb-4">
                {formError}
              </Text>
            ) : null}
            <Text className="text-base font-bold text-grey-900 mb-3">Tên</Text>
            <TextInput
              accessibilityLabel="Họ tên"
              maxLength={100}
              editable={!isLoading}
              value={fullName}
              onChangeText={setFullName}
              className="w-full h-14 px-5 rounded-2xl border border-grey-100 font-medium text-grey-800"
            />

            <Text className="text-base font-bold text-grey-900 mt-6 mb-3">
              Tuổi (không bắt buộc)
            </Text>
            <TextInput
              accessibilityLabel="Tuổi"
              value={age}
              onChangeText={setAge}
              editable={!isLoading}
              keyboardType="number-pad"
              maxLength={3}
              className="min-h-14 px-5 rounded-2xl border border-grey-100 text-grey-800"
            />
            <Text className="text-base font-bold text-grey-900 mt-6 mb-3">
              Email
            </Text>
            <TextInput
              value={user?.email || ""}
              editable={false}
              className="w-full h-14 px-5 rounded-2xl bg-grey-50 border border-grey-100 font-medium text-grey-400"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
