import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import { googleAuth, getSessionAttempt } from "./auth-actions";
import { toApiError } from "@/shared/api/api-error";
import type * as GoogleModule from "@react-native-google-signin/google-signin";

let native: typeof GoogleModule | null = null;
let configured = false;
let signingIn = false;
let nativeLoad: Promise<typeof GoogleModule | null> | null = null;
export const configureGoogleSignIn = async () => {
  if (Platform.OS === "web") return;
  const webClientId = process.env.EXPO_PUBLIC_KEY_GOOGLE_WEB;
  const iosClientId = process.env.EXPO_PUBLIC_KEY_GOOGLE_IOS;
  if (!webClientId || (Platform.OS === "ios" && !iosClientId)) return;
  nativeLoad ??= import("@react-native-google-signin/google-signin").catch(
    () => null,
  );
  native = await nativeLoad;
  if (!native) return;
  try {
    native.GoogleSignin.configure({
      webClientId,
      iosClientId,
      offlineAccess: false,
    });
    configured = true;
  } catch {
    configured = false;
  }
};
export function googleSignInRequirement(): string | null {
  if (Platform.OS === "web")
    return "Đăng nhập Google cần ứng dụng native; web hiện hỗ trợ email/mật khẩu.";
  if (
    !process.env.EXPO_PUBLIC_KEY_GOOGLE_WEB ||
    (Platform.OS === "ios" && !process.env.EXPO_PUBLIC_KEY_GOOGLE_IOS)
  )
    return "Cần cấu hình Google client ID và tạo lại native build.";
  return !native || !configured
    ? "Google cần bản development/native build, không dùng Expo Go."
    : null;
}
export const handleGoogleSignIn = async () => {
  if (signingIn) return;
  signingIn = true;
  const attempt = getSessionAttempt();
  await configureGoogleSignIn();
  const requirement = googleSignInRequirement();
  if (requirement || !native) {
    signingIn = false;
    Toast.show({
      type: "info",
      text1: "Google chưa khả dụng",
      text2: requirement ?? "Cần native build",
    });
    return;
  }
  try {
    if (Platform.OS === "android") await native.GoogleSignin.hasPlayServices();
    const response = await native.GoogleSignin.signIn();
    if (response.type === "cancelled") return;
    if (!response.data.idToken)
      throw new Error("Không nhận được Google ID token");
    await googleAuth({ access_token: response.data.idToken }, attempt);
    Toast.show({ type: "success", text1: "Đăng nhập Google thành công" });
  } catch (error) {
    Toast.show({
      type: "error",
      text1: "Đăng nhập Google thất bại",
      text2: toApiError(error).message,
    });
  } finally {
    signingIn = false;
  }
};
