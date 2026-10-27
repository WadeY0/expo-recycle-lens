import Toast from "react-native-toast-message";
import { toApiError } from "@/shared/api/api-error";
import { getMeApi } from "@/features/auth/api/get-me";
import { signOutAuth } from "@/features/auth/lib/auth-actions";
import { useAuthStore } from "@/features/auth/store/auth.store";

import { EcoAvatarProgress } from "@/features/gamification/components/EcoAvatarProgress";
import { useEcoOverview } from "@/features/gamification/lib/gamification-hooks";

import { useFocusEffect, useRouter } from "expo-router";
import {
  BookSquare,
  CloseCircle,
  DocumentText,
  Edit2,
  Heart,
  InfoCircle,
  LogoutCurve,
  MessageQuestion,
  Scan,
  User as UserIcon,
} from "iconsax-react-nativejs";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { applyProfileResponse } from "../lib/profile-session";

// ========================================
// MENU ITEM
// ========================================

type MenuIcon = typeof InfoCircle;

function MenuItem({
  icon: Icon,
  label,
  description,
  onPress,
  destructive = false,
}: {
  icon: MenuIcon;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-16 flex-row items-center px-3 py-3"
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-grey-50">
        <Icon
          size={21}
          color={destructive ? "#EB5757" : "#454F5B"}
          variant="Linear"
        />
      </View>

      <View className="ml-3 flex-1">
        <Text
          className={`text-sm font-semibold ${
            destructive ? "text-red-600" : "text-grey-900"
          }`}
        >
          {label}
        </Text>

        {description && (
          <Text className="mt-1 text-xs leading-5 text-grey-500">
            {description}
          </Text>
        )}
      </View>

      {!destructive && <Text className="ml-2 text-xl text-grey-400">›</Text>}
    </Pressable>
  );
}

function MenuGroup({ children }: { children: React.ReactNode }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-grey-200 bg-white">
      {children}
    </View>
  );
}

function QuickAction({
  icon: Icon,
  title,
  onPress,
}: {
  icon: MenuIcon;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="min-h-[104px] flex-1 items-center justify-center rounded-2xl border border-grey-200 bg-white px-2 py-3"
    >
      <View className="mb-2 h-11 w-11 items-center justify-center rounded-xl bg-primary-50">
        <Icon size={23} color="#159947" variant="Linear" />
      </View>

      <Text
        className="text-center text-xs font-semibold text-grey-800"
        numberOfLines={2}
      >
        {title}
      </Text>
    </Pressable>
  );
}

// ========================================
// PROFILE SCREEN
// ========================================

export function ProfileScreen() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);

  const ecoQuery = useEcoOverview();
  const eco = ecoQuery.data;

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [profileError, setProfileError] = useState(false);

  const [profileRefreshing, setProfileRefreshing] = useState(false);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!useAuthStore.getState().user) return;

    setProfileRefreshing(true);

    try {
      const updated = await getMeApi();

      if (mounted.current) {
        applyProfileResponse(updated);
        setProfileError(false);
      }
    } catch {
      if (mounted.current) {
        setProfileError(true);
      }
    } finally {
      if (mounted.current) {
        setProfileRefreshing(false);
      }
    }
  }, []);

  // Refresh profile and XP whenever this tab gains focus.
  useFocusEffect(
    useCallback(() => {
      void refreshProfile();

      if (user?.id) {
        void ecoQuery.refetch();
      }
    }, [refreshProfile, user?.id, ecoQuery.refetch])
  );

  const refreshAll = () => {
    void refreshProfile();
    void ecoQuery.refetch();
  };

  const onLogout = async () => {
    try {
      await signOutAuth();

      if (mounted.current) {
        setShowLogoutModal(false);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Không thể hoàn tất đăng xuất",
        text2: toApiError(error).message,
      });

      if (mounted.current) {
        setShowLogoutModal(false);
      }
    }
  };

  const totalXp = eco?.totalXp ?? null;
  const level = eco?.level ?? null;

  const remainingXp =
    eco?.nextLevelXp === null
      ? null
      : eco
        ? Math.max(0, eco.nextLevelXp - eco.totalXp)
        : null;

  const formatXp = (value: number) => value.toLocaleString("vi-VN");

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* PAGE HEADER */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-grey-900">Cá nhân</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cài đặt tài khoản"
          onPress={() => router.push("/(protected)/account-settings")}
          className="min-h-11 justify-center rounded-xl bg-grey-100 px-4"
        >
          <Text className="text-sm font-semibold text-grey-700">Cài đặt</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 115,
        }}
        refreshControl={
          <RefreshControl
            refreshing={profileRefreshing || ecoQuery.isRefetching}
            onRefresh={refreshAll}
            tintColor="#159947"
          />
        }
      >
        {/* PROFILE REFRESH ERROR */}
        {profileError && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void refreshProfile();
            }}
            className="mb-4 rounded-xl bg-red-50 px-4 py-3"
          >
            <Text className="text-sm text-red-600">
              Không làm mới được hồ sơ. Chạm để thử lại.
            </Text>
          </Pressable>
        )}

        {/* ================================= */}
        {/* PLAYER PROFILE & XP               */}
        {/* ================================= */}

        <View className="mt-2 rounded-3xl border border-primary-100 bg-primary-50 p-4">
          <View className="flex-row items-center">
            <EcoAvatarProgress
              avatar={user?.avatar}
              level={level}
              progressPercent={eco?.progressPercent ?? null}
              size={112}
            />

            <View className="ml-3 min-w-0 flex-1">
              <Text
                className="text-lg font-bold text-grey-900"
                numberOfLines={2}
              >
                {user?.fullName || "Người dùng"}
              </Text>

              {user?.email && (
                <Text className="mt-1 text-xs text-grey-500" numberOfLines={1}>
                  {user.email}
                </Text>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chỉnh sửa hồ sơ"
                onPress={() => router.push("/(protected)/edit-profile")}
                className="mt-3 min-h-9 flex-row items-center self-start rounded-xl border border-primary-100 bg-white px-3"
              >
                <Edit2 size={15} color="#159947" />

                <Text className="ml-2 text-xs font-semibold text-primary-main">
                  Sửa hồ sơ
                </Text>
              </Pressable>
            </View>
          </View>

          {/* XP SUMMARY */}
          <View className="mt-4 border-t border-primary-100 pt-4">
            {eco ? (
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-grey-600">
                    TỔNG ECO XP
                  </Text>

                  <Text className="mt-1 text-2xl font-bold text-primary-main">
                    {formatXp(totalXp ?? 0)} XP
                  </Text>
                </View>

                <View className="flex-1 items-end">
                  <Text className="text-sm font-bold text-grey-900">
                    Cấp {eco.level}
                  </Text>

                  <Text
                    className="mt-1 text-right text-xs leading-5 text-grey-600"
                    numberOfLines={2}
                  >
                    {remainingXp === null
                      ? "Đã đạt cấp tối đa"
                      : `Còn ${formatXp(remainingXp)} XP để lên cấp`}
                  </Text>
                </View>
              </View>
            ) : ecoQuery.isPending ? (
              <View className="flex-row items-center py-2">
                <ActivityIndicator size="small" color="#159947" />

                <Text className="ml-3 text-sm text-grey-600">
                  Đang tải XP và cấp độ...
                </Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void ecoQuery.refetch();
                }}
                className="py-2"
              >
                <Text className="text-sm font-semibold text-primary-main">
                  Chưa tải được tiến độ XP. Thử lại →
                </Text>
              </Pressable>
            )}

            {eco && ecoQuery.isError && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void ecoQuery.refetch();
                }}
                className="mt-2"
              >
                <Text className="text-xs text-red-600">
                  Chưa cập nhật được XP mới nhất. Chạm để thử lại.
                </Text>
              </Pressable>
            )}
          </View>

          {/* ECO DASHBOARD CTA */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem hành trình xanh"
            onPress={() => router.push("/(protected)/eco-dashboard")}
            className="mt-4 min-h-12 flex-row items-center justify-between rounded-xl bg-white px-4"
          >
            <Text className="text-sm font-bold text-primary-main">
              Xem hành trình xanh
            </Text>

            <Text className="text-xl text-primary-main">→</Text>
          </Pressable>
        </View>

        {/* ================================= */}
        {/* GAMIFICATION SHORTCUTS           */}
        {/* ================================= */}

        <Text className="mb-3 mt-7 text-lg font-bold text-grey-900">
          Hoạt động của bạn
        </Text>

        <View className="flex-row gap-3">
          <QuickAction
            icon={Scan}
            title="Lịch sử quét"
            onPress={() => router.push("/(protected)/scan-history")}
          />

          <QuickAction
            icon={DocumentText}
            title="Thành tựu"
            onPress={() => router.push("/(protected)/achievements")}
          />

          <QuickAction
            icon={BookSquare}
            title="Thử thách"
            onPress={() => router.push("/(protected)/challenges")}
          />
        </View>

        {/* ================================= */}
        {/* ACCOUNT & PERSONAL CONTENT       */}
        {/* ================================= */}

        <Text className="mb-3 mt-8 text-lg font-bold text-grey-900">
          Tài khoản & nội dung
        </Text>

        <MenuGroup>
          <MenuItem
            icon={Heart}
            label="Nội dung đã lưu"
            description="Rác chuẩn, bài viết và kiến thức"
            onPress={() => router.push("/(protected)/favorites")}
          />

          <View className="mx-3 h-px bg-grey-100" />

          <MenuItem
            icon={UserIcon}
            label="Bảo mật tài khoản"
            description="Mật khẩu và bảo vệ tài khoản"
            onPress={() => router.push("/(protected)/account-settings")}
          />
        </MenuGroup>

        {/* ================================= */}
        {/* SUPPORT & INFORMATION            */}
        {/* ================================= */}

        <Text className="mb-3 mt-8 text-lg font-bold text-grey-900">
          Hỗ trợ & thông tin
        </Text>

        <MenuGroup>
          <MenuItem
            icon={MessageQuestion}
            label="Liên hệ hỗ trợ"
            onPress={() => router.push("/(protected)/contact")}
          />

          <View className="mx-3 h-px bg-grey-100" />

          <MenuItem
            icon={InfoCircle}
            label="Giới thiệu RecycleLens"
            onPress={() => router.push("/(protected)/about")}
          />

          <View className="mx-3 h-px bg-grey-100" />

          <MenuItem
            icon={DocumentText}
            label="Điều khoản & Điều kiện"
            onPress={() => router.push("/(protected)/terms")}
          />
        </MenuGroup>

        {/* ================================= */}
        {/* LOGOUT                            */}
        {/* ================================= */}

        <View className="mt-6">
          <MenuGroup>
            <MenuItem
              icon={LogoutCurve}
              label="Đăng xuất"
              destructive
              onPress={() => setShowLogoutModal(true)}
            />
          </MenuGroup>
        </View>
      </ScrollView>

      {/* ================================= */}
      {/* LOGOUT CONFIRMATION               */}
      {/* ================================= */}

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!authLoading) {
            setShowLogoutModal(false);
          }
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-3xl bg-white p-6">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              disabled={authLoading}
              onPress={() => setShowLogoutModal(false)}
              className="mb-3 h-10 w-10 self-end items-center justify-center"
            >
              <CloseCircle size={25} color="#919EAB" />
            </Pressable>

            <Text className="text-center text-xl font-bold text-grey-900">
              Đăng xuất?
            </Text>

            <Text className="mt-3 text-center text-sm leading-6 text-grey-600">
              Bạn có chắc chắn muốn đăng xuất khỏi RecycleLens?
            </Text>

            <View className="mt-7 flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={authLoading}
                onPress={() => setShowLogoutModal(false)}
                className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-grey-200"
              >
                <Text className="font-semibold text-grey-700">Hủy</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={authLoading}
                onPress={() => {
                  void onLogout();
                }}
                className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-primary-main"
              >
                {authLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-semibold text-white">Đăng xuất</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
