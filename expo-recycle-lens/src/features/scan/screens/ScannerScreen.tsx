import { invalidateGamification } from "@/features/gamification/lib/gamification-hooks";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSessionAttempt } from "@/features/auth/lib/session-generation";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  assertScanSession,
  canRetryScan,
  createScanAttempt,
  submitScanAttempt,
  type ScanAttempt,
} from "../lib/scan-attempt";
import type { ScanImageInput } from "../lib/scan-upload";
import { cacheScanResult } from "../lib/scan-result";
export function ScannerScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>();
  const camera = useRef<CameraView>(null);
  const busy = useRef(false);
  const pending = useRef<ScanAttempt | null>(null);
  const ownerId = useAuthStore((state) => state.user?.id);
  useEffect(() => {
    pending.current = null;
    setError(undefined);
  }, [ownerId]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current = null;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      void camera.current?.resumePreview();
    }, []),
  );
  const submit = async (attempt: ScanAttempt) => {
    pending.current = attempt;
    try {
      const result = await submitScanAttempt(attempt);
      const scanId = cacheScanResult(
        client,
        result,
        attempt.ownerId,
        attempt.generation,
      );
      pending.current = null;
      void Promise.all([
        client.invalidateQueries({ queryKey: ["vision", "history"] }),
        invalidateGamification(client),
      ]).catch(() => undefined);
      assertScanSession(attempt.generation, attempt.ownerId);
      if (mounted.current)
        router.push({
          pathname: "/(protected)/scan-result/[id]",
          params: { id: scanId },
        });
    } catch (failure) {
      if (!canRetryScan(failure)) pending.current = null;
      throw failure;
    }
  };
  const scan = async (image: ScanImageInput, generation: number) => {
    pending.current = null;
    return submit(createScanAttempt(image, generation));
  };
  const run = async (action: (generation: number) => Promise<void>) => {
    if (busy.current) return;
    const generation = getSessionAttempt();
    busy.current = true;
    setIsScanning(true);
    setError(undefined);
    try {
      await action(generation);
    } catch (failure) {
      if (mounted.current && generation === getSessionAttempt())
        setError(
          failure instanceof Error
            ? failure.message
            : "Không thể quét ảnh. Vui lòng thử lại.",
        );
    } finally {
      busy.current = false;
      if (mounted.current) {
        setIsScanning(false);
        void camera.current?.resumePreview();
      }
    }
  };
  const gallery = () =>
    run(async (generation) => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await scan(
          {
            uri: asset.uri,
            mimeType: asset.mimeType,
            fileSize: asset.fileSize,
            file: asset.file,
          },
          generation,
        );
      }
    });
  const capture = () =>
    run(async (generation) => {
      if (!camera.current || !permission?.granted)
        throw new Error("Camera chưa sẵn sàng.");
      const photo = await camera.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (!photo?.uri) throw new Error("Không chụp được ảnh.");
      await scan({ uri: photo.uri, mimeType: "image/jpeg" }, generation);
    });
  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top", "bottom"]}>
      <View className="flex-row justify-between px-6 py-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
        >
          <Text className="text-white text-lg">← Quay lại</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lịch sử quét"
          onPress={() => router.push("/(protected)/scan-history")}
        >
          <Text className="text-white">Lịch sử</Text>
        </Pressable>
      </View>
      <View className="flex-1 mx-6 rounded-3xl overflow-hidden bg-grey-900 justify-center">
        {permission?.granted ? (
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
          />
        ) : (
          <View className="p-6">
            <Text className="text-white text-center mb-6">
              Cấp quyền để chụp ảnh. Bạn vẫn có thể chọn ảnh từ thư viện.
            </Text>
            <Pressable
              onPress={() => {
                void requestPermission().catch(() =>
                  setError(
                    "Không cấp được quyền camera. Bạn có thể chọn ảnh từ thư viện.",
                  ),
                );
              }}
              className="p-4 bg-primary-main rounded-2xl"
            >
              <Text className="text-white text-center">Cấp quyền camera</Text>
            </Pressable>
          </View>
        )}
      </View>
      <Text className="text-white text-center mx-6 mt-4">
        Chụp một vật, đủ sáng và nhãn vật liệu rõ. Không chạm vào vật nghi nguy
        hại.
      </Text>
      {error && (
        <Text accessibilityRole="alert" className="text-red-300 mx-6 mt-3">
          {error}
        </Text>
      )}
      {error && pending.current && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thử lại ảnh đã chọn"
          disabled={isScanning}
          onPress={() => {
            void run(async () => {
              if (pending.current) await submit(pending.current);
            });
          }}
          className="mx-6 py-3"
        >
          <Text className="text-white text-center">Thử lại ảnh đã chọn</Text>
        </Pressable>
      )}
      {isScanning && (
        <View className="items-center mt-4">
          <ActivityIndicator color="#159947" />
          <Text className="text-white mt-2">
            Đang phân tích và lưu lịch sử...
          </Text>
        </View>
      )}
      <View className="flex-row gap-4 px-6 py-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chọn ảnh từ thư viện"
          disabled={isScanning}
          onPress={() => {
            void gallery();
          }}
          className="flex-1 p-4 rounded-2xl bg-grey-700"
        >
          <Text className="text-white text-center">Chọn ảnh</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chụp và quét ảnh"
          disabled={isScanning || !permission?.granted}
          onPress={() => {
            void capture();
          }}
          className="flex-1 p-4 rounded-2xl bg-primary-main"
        >
          <Text className="text-white text-center">Chụp và quét</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
