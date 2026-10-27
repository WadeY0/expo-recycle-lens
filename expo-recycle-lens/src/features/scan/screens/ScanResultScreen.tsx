import {
  articlePlainText,
  sanitizeArticleHtml,
} from "@/features/articles/lib/safe-content";
import { GuidancePanel } from "@/features/waste-library/components/GuidancePanel";
import { RemoteImage } from "@/shared/components/ui/RemoteImage";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScanAiContent } from "../components/ScanAiContent";
import { recognitionLabel } from "../lib/scan-result";
import { useVisionDetail } from "../lib/vision-hooks";

export function ScanResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  // Fresh authenticated POST data is already cached; history/direct links use
  // the same owner-scoped detail endpoint. Route JSON is never trusted.
  const query = useVisionDetail(id ?? "");
  const item = query.data;
  const analysis = item?.analysis ?? item?.scanAnalysis?.result;
  const html = sanitizeArticleHtml(
    (analysis?.contentFormat === "html"
      ? (item?.content ?? analysis.content)
      : (analysis?.content ?? (!analysis ? item?.content : ""))) ?? ""
  );
  const content = articlePlainText(html, 64000);
  const legacyText = `${item?.title ?? ""} ${content}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const hazardous =
    analysis?.potentiallyHazardous ??
    /\b(pin|battery|chemical|hoa chat|nguy hai|kim tiem|sac nhon)\b/.test(
      legacyText
    );

  const hasStructuredHtml =
    analysis?.contentFormat === "html" && content.trim().length > 0;
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => router.back()}
        className="px-6 py-4"
      >
        <Text className="text-primary-main text-lg">← Quay lại</Text>
      </Pressable>
      {query.isLoading && !item ? (
        <ActivityIndicator className="flex-1" />
      ) : !item ? (
        <View className="p-6">
          <Text>{query.error?.message ?? "Không tìm thấy kết quả."}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void query.refetch();
            }}
          >
            <Text className="text-primary-main mt-4">Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          {(item.imageUrl ?? item.image) && (
            <RemoteImage
              uri={(item.imageUrl ?? item.image)!}
              style={{
                width: width - 48,
                height: 250,
                borderRadius: 24,
                marginBottom: 24,
              }}
            />
          )}
          <Text className="text-grey-500 mb-2">Vật thể do AI nhận dạng</Text>
          <Text className="text-2xl font-bold text-grey-900 mb-4">
            {analysis?.label ?? item.title}
          </Text>
          {query.error && (
            <Pressable
              onPress={() => {
                void query.refetch();
              }}
            >
              <Text className="text-red-600 mb-4">
                Chưa cập nhật được kết quả đã lưu. Chạm để thử lại.
              </Text>
            </Pressable>
          )}
          <Text className="text-primary-main font-bold mb-4">
            {analysis
              ? recognitionLabel(analysis)
              : "Kết quả AI cũ · chưa có dữ liệu có cấu trúc"}
          </Text>
          <Text className="text-grey-600 mb-4">
            {analysis?.disclaimer ??
              "AI có thể sai. Nội dung cũ chưa được xác minh; kiểm tra vật liệu và nơi thu gom trước xử lý."}
          </Text>
          {hazardous && (
            <Text
              accessibilityRole="alert"
              className="text-red-600 font-bold mb-4"
            >
              ⚠️ Có khả năng nguy hại. Không tháo, đốt, tráng hoặc đưa vào tái
              chế chung theo gợi ý AI.
            </Text>
          )}
          {!hasStructuredHtml && (
            <>
              {analysis?.material && (
                <View className="mb-4">
                  <Text className="font-bold text-grey-900">
                    Vật liệu AI gợi ý
                  </Text>
                  <Text className="text-grey-700">{analysis.material}</Text>
                </View>
              )}

              {!hazardous && analysis?.observations && (
                <View className="mb-4">
                  <Text className="font-bold text-grey-900">
                    Quan sát do AI cung cấp
                  </Text>
                  <Text className="text-grey-700">{analysis.observations}</Text>
                </View>
              )}

              {analysis?.items && analysis.items.length > 0 && (
                <View className="mb-4">
                  <Text className="font-bold text-grey-900">
                    Các vật AI gợi ý
                  </Text>
                  <Text className="text-grey-700">
                    {analysis.items.join(", ")}
                  </Text>
                </View>
              )}
            </>
          )}
          {content ? (
            <View className="mb-5">
              <Text className="font-bold text-grey-900 mb-2">
                Phân tích và gợi ý của AI · chưa xác minh
              </Text>
              <ScanAiContent
                html={html}
                contentWidth={Math.max(width - 48, 1)}
              />
            </View>
          ) : (
            !hazardous && (
              <Text className="text-grey-500 mb-4">
                Bản phân tích này không có nội dung AI chi tiết được lưu.
              </Text>
            )
          )}
          {analysis && (
            <>
              {analysis.safetyAdvice.map((line, index) => (
                <Text key={index} className="text-grey-700 leading-6 mb-2">
                  • {line}
                </Text>
              ))}
              {!analysis.matchedWaste &&
                analysis.libraryMatchStatus !== "not_requested" && (
                  <Text className="text-grey-500 mt-4">
                    {analysis.libraryMatchStatus === "unavailable"
                      ? "Thư viện hiện chưa sẵn sàng; kết quả AI vẫn được lưu."
                      : "Chưa có mục thư viện được xác nhận cho kết quả này."}
                  </Text>
                )}
              {analysis.matchedWaste && (
                <View className="mt-6">
                  <Text className="text-lg font-bold text-grey-900 mb-3">
                    Tham khảo thêm từ thư viện
                  </Text>
                  {analysis.guidance && (
                    <GuidancePanel guidance={analysis.guidance} />
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/(protected)/waste-details/[id]",
                        params: { id: analysis.matchedWaste!.articleId },
                      })
                    }
                    className="p-4 mt-4 rounded-2xl bg-primary-50"
                  >
                    <Text className="text-primary-main font-bold">
                      Mở mục thư viện: {analysis.matchedWaste.name}
                    </Text>
                  </Pressable>
                </View>
              )}
              {!analysis.matchedWaste && analysis.candidates.length > 0 && (
                <View className="mt-5">
                  <Text className="font-bold text-grey-900">
                    Mục thư viện gợi ý · chưa xác nhận
                  </Text>
                  {analysis.candidates.map((candidate) => (
                    <Pressable
                      key={candidate.slug}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: "/(protected)/waste-details/[id]",
                          params: { id: candidate.articleId },
                        })
                      }
                      className="py-3"
                    >
                      <Text className="text-primary-main">
                        {candidate.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
          <Pressable
            onPress={() => router.push("/(protected)/(tabs)/library")}
            className="p-4 mt-5 rounded-2xl bg-grey-100"
          >
            <Text className="text-primary-main text-center">
              Tra thư viện rác
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/(protected)/scanner")}
            className="p-4 mt-4 rounded-2xl bg-primary-main"
          >
            <Text className="text-white text-center">Quét ảnh khác</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
