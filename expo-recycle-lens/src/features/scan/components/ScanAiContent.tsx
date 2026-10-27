import { useMemo } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import RenderHtml from "react-native-render-html";

import { safeContentUrl } from "@/features/articles/lib/safe-content";

import {
  parseScanResultContent,
  type ScanContentSection,
} from "../lib/scan-html-parser";

interface ScanAiContentProps {
  html: string;
  contentWidth: number;
}

const COLORS = {
  primary: "#159947",
  title: "#1F2937",
  body: "#455468",
  muted: "#718096",
  border: "#E5EBE8",
  surface: "#FFFFFF",
  soft: "#F7FAF8",
  warning: "#9A6700",
  warningBorder: "#F1DFC0",
};

const htmlStyles = {
  p: {
    fontSize: 15,
    lineHeight: 25,
    color: COLORS.body,
    marginTop: 0,
    marginBottom: 10,
  },
  ul: {
    marginTop: 2,
    marginBottom: 4,
    paddingLeft: 12,
  },
  ol: {
    marginTop: 2,
    marginBottom: 4,
    paddingLeft: 12,
  },
  li: {
    fontSize: 15,
    lineHeight: 25,
    color: COLORS.body,
    marginBottom: 8,
  },
  strong: {
    fontWeight: "700" as const,
    color: COLORS.title,
  },
  b: {
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: COLORS.title,
    marginTop: 14,
    marginBottom: 8,
  },
  h3: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: COLORS.title,
    marginTop: 12,
    marginBottom: 8,
  },
  h4: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: COLORS.title,
    marginTop: 10,
    marginBottom: 6,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: 12,
    marginVertical: 10,
  },
  a: {
    color: COLORS.primary,
    textDecorationLine: "underline" as const,
  },
};

function HtmlBody({ html, width }: { html: string; width: number }) {
  if (!html.trim()) return null;

  return (
    <RenderHtml
      contentWidth={Math.max(width, 1)}
      source={{ html }}
      baseStyle={{
        color: COLORS.body,
        fontSize: 15,
        lineHeight: 25,
      }}
      tagsStyles={htmlStyles}
      renderersProps={{
        a: {
          onPress: (_event, href) => {
            const url = safeContentUrl(href);

            if (url) {
              void Linking.openURL(url).catch(() => undefined);
            }
          },
        },
      }}
    />
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SectionCard({
  section,
  index,
  width,
}: {
  section: ScanContentSection;
  index: number;
  width: number;
}) {
  const isWarning = section.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("canh bao");

  return (
    <View style={[styles.sectionCard, isWarning && styles.warningCard]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNumber}>
          <Text style={styles.sectionNumberText}>
            {String(index + 1).padStart(2, "0")}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, isWarning && styles.warningTitle]}>
          {section.title}
        </Text>
      </View>

      <HtmlBody html={section.html} width={width - 36} />
    </View>
  );
}

export function ScanAiContent({ html, contentWidth }: ScanAiContentProps) {
  const parsed = useMemo(() => parseScanResultContent(html), [html]);

  const { overview, introHtml, sections } = parsed;

  const hasOverview =
    !!overview.category || !!overview.group || !!overview.binColor;

  return (
    <View style={styles.container}>
      {hasOverview && (
        <View style={styles.overviewSection}>
          <Text style={styles.groupTitle}>Thông tin phân loại</Text>

          {(overview.category || overview.group) && (
            <View style={styles.infoRow}>
              {overview.category && (
                <InfoCard label="Danh mục" value={overview.category} />
              )}

              {overview.group && (
                <InfoCard label="Nhóm rác" value={overview.group} />
              )}
            </View>
          )}

          {overview.binColor && (
            <View style={styles.binCard}>
              <Text style={styles.binLabel}>Màu thùng rác đề xuất</Text>

              <Text style={styles.binValue}>{overview.binColor}</Text>
            </View>
          )}
        </View>
      )}

      {!!introHtml.trim() && (
        <View style={styles.sectionCard}>
          <HtmlBody html={introHtml} width={contentWidth - 36} />
        </View>
      )}

      {sections.length > 0 && (
        <Text style={styles.groupTitle}>Phân tích chi tiết</Text>
      )}

      {sections.map((section, index) => (
        <SectionCard
          key={section.id}
          section={section}
          index={index}
          width={contentWidth}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  overviewSection: {
    gap: 12,
    marginBottom: 4,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.title,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    color: COLORS.title,
  },
  binCard: {
    padding: 15,
    borderRadius: 14,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  binLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 7,
  },
  binValue: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.body,
  },
  sectionCard: {
    padding: 17,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  warningCard: {
    borderColor: COLORS.warningBorder,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 14,
  },
  sectionNumber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.soft,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.title,
    flex: 1,
    lineHeight: 23,
  },
  warningTitle: {
    color: COLORS.warning,
  },
});
