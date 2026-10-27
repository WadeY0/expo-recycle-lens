import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { ArrowDown2 } from "iconsax-react-nativejs";

import { safeContentUrl } from "@/features/articles/lib/safe-content";

import type { WasteGuidance } from "../types/waste.types";
import { RECYCLING_LABELS } from "../types/waste.types";

function GuidanceSection({ title, lines }: { title: string; lines: string[] }) {
  const validLines = lines.filter((line) => line.trim().length > 0);

  if (validLines.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      <Text
        accessibilityRole="header"
        className="mb-3 text-lg font-bold text-grey-900"
      >
        {title}
      </Text>

      {validLines.map((line, index) => (
        <View key={`${index}-${line}`} className="mb-3 flex-row items-start">
          <View className="mr-3 mt-[9px] h-1.5 w-1.5 rounded-full bg-primary-main" />

          <Text className="flex-1 text-[15px] leading-6 text-grey-700">
            {line}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ExpandableSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-3 overflow-hidden rounded-2xl border border-grey-200 bg-white">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{
          expanded,
        }}
        onPress={onToggle}
        className="min-h-14 flex-row items-center justify-between px-4 py-3"
      >
        <Text className="flex-1 text-sm font-bold text-grey-900">{title}</Text>

        <ArrowDown2
          size={19}
          color="#637381"
          style={{
            transform: [
              {
                rotate: expanded ? "180deg" : "0deg",
              },
            ],
          }}
        />
      </Pressable>

      {expanded && (
        <View className="border-t border-grey-100 px-4 pt-4">{children}</View>
      )}
    </View>
  );
}

export function GuidancePanel({ guidance }: { guidance: WasteGuidance }) {
  const [showExamples, setShowExamples] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const hasExamples = guidance.examples.length > 0;
  const hasSources = guidance.provenance.length > 0;

  const showLocalContext =
    !!guidance.localContext?.trim() &&
    guidance.localContext.trim() !== guidance.uncertainty?.trim();

  const openSource = (rawUrl: string) => {
    const url = safeContentUrl(rawUrl);

    if (!url) {
      Toast.show({
        type: "error",
        text1: "Liên kết nguồn không hợp lệ",
      });
      return;
    }

    void Linking.openURL(url).catch(() => {
      Toast.show({
        type: "error",
        text1: "Không mở được nguồn tham khảo",
      });
    });
  };

  return (
    <View>
      {/* Primary recycling guidance */}
      <View className="mb-5 rounded-2xl border border-primary-100 bg-primary-50 p-4">
        <Text className="mb-2 text-xs font-semibold text-primary-main">
          HƯỚNG DẪN PHÂN LOẠI
        </Text>

        <Text className="text-base font-bold leading-6 text-grey-900">
          {RECYCLING_LABELS[guidance.recycling]}
        </Text>
      </View>

      {/* Hazard must always be visible */}
      {guidance.hazardous && (
        <View
          accessibilityRole="alert"
          className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4"
        >
          <Text className="mb-2 text-base font-bold text-red-700">
            ⚠️ Cần xử lý thận trọng
          </Text>

          <Text className="text-sm leading-6 text-red-700">
            Vật liệu này có thể gây nguy hại. Cần kiểm tra hướng dẫn thu gom
            chuyên biệt trước khi xử lý.
          </Text>
        </View>
      )}

      {!!guidance.uncertainty?.trim() && (
        <View className="mb-6">
          <Text className="text-sm leading-6 text-grey-600">
            {guidance.uncertainty}
          </Text>
        </View>
      )}

      {/* Safety information remains expanded */}
      <GuidanceSection title="Chuẩn bị an toàn" lines={guidance.preparation} />

      <GuidanceSection
        title="Cách xử lý và thu gom"
        lines={guidance.disposal}
      />

      <GuidanceSection title="Lưu ý và cảnh báo" lines={guidance.warnings} />

      {showLocalContext && (
        <View className="mb-6 rounded-2xl bg-grey-50 p-4">
          <Text className="mb-2 text-sm font-bold text-grey-900">
            Lưu ý theo địa phương
          </Text>

          <Text className="text-sm leading-6 text-grey-700">
            {guidance.localContext}
          </Text>
        </View>
      )}

      {/* Secondary educational content */}
      {hasExamples && (
        <ExpandableSection
          title="Ví dụ liên quan"
          expanded={showExamples}
          onToggle={() => setShowExamples((previous) => !previous)}
        >
          <GuidanceSection title="Các ví dụ" lines={guidance.examples} />
        </ExpandableSection>
      )}

      {hasSources && (
        <ExpandableSection
          title={`Nguồn tham khảo (${guidance.provenance.length})`}
          expanded={showSources}
          onToggle={() => setShowSources((previous) => !previous)}
        >
          {guidance.provenance.map((source, index) => (
            <View key={`${index}-${source.url}`} className="mb-5">
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Mở nguồn ${source.publisher}`}
                onPress={() => openSource(source.url)}
              >
                <Text className="text-sm font-semibold leading-6 text-primary-main underline">
                  {source.publisher}: {source.title}
                </Text>
              </Pressable>

              {!!source.scope && (
                <Text className="mt-2 text-xs leading-5 text-grey-600">
                  {source.scope}
                </Text>
              )}
            </View>
          ))}

          <Text className="mb-4 text-xs leading-5 text-grey-500">
            Các nguồn tham khảo chưa được xác minh trực tuyến trong phiên bản dữ
            liệu này.
          </Text>

          <Text className="mb-4 text-xs text-grey-500">
            Phiên bản hướng dẫn: {guidance.version}
          </Text>
        </ExpandableSection>
      )}
    </View>
  );
}
