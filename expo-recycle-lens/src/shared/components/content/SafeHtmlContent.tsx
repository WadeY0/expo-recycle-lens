import { useMemo } from "react";
import { Linking, Text } from "react-native";
import RenderHtml, { defaultSystemFonts } from "react-native-render-html";
import Toast from "react-native-toast-message";

import {
  safeContentUrl,
  sanitizeArticleHtml,
} from "@/features/articles/lib/safe-content";

interface SafeHtmlContentProps {
  html: string;
  contentWidth: number;
}

const tagStyles = {
  p: {
    color: "#454F5B",
    fontSize: 15,
    lineHeight: 26,
    marginTop: 0,
    marginBottom: 12,
  },
  h1: {
    color: "#161C24",
    fontSize: 23,
    fontWeight: "700" as const,
    lineHeight: 31,
    marginTop: 20,
    marginBottom: 12,
  },
  h2: {
    color: "#161C24",
    fontSize: 20,
    fontWeight: "700" as const,
    lineHeight: 28,
    marginTop: 18,
    marginBottom: 10,
  },
  h3: {
    color: "#212B36",
    fontSize: 17,
    fontWeight: "700" as const,
    lineHeight: 25,
    marginTop: 16,
    marginBottom: 8,
  },
  h4: {
    color: "#212B36",
    fontSize: 16,
    fontWeight: "700" as const,
    marginTop: 12,
    marginBottom: 6,
  },
  ul: {
    marginTop: 4,
    marginBottom: 14,
    paddingLeft: 16,
  },
  ol: {
    marginTop: 4,
    marginBottom: 14,
    paddingLeft: 16,
  },
  li: {
    color: "#454F5B",
    fontSize: 15,
    lineHeight: 25,
    marginBottom: 7,
  },
  strong: {
    fontWeight: "700" as const,
    color: "#212B36",
  },
  b: {
    fontWeight: "700" as const,
    color: "#212B36",
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#159947",
    paddingLeft: 12,
    marginVertical: 12,
  },
  a: {
    color: "#159947",
    textDecorationLine: "underline" as const,
  },
};

export function SafeHtmlContent({ html, contentWidth }: SafeHtmlContentProps) {
  const sanitized = useMemo(() => sanitizeArticleHtml(html), [html]);

  // Giữ xuống dòng cho dữ liệu plain text cũ.
  const renderedHtml = useMemo(() => {
    const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(html);

    return looksLikeHtml ? sanitized : sanitized.replace(/\r?\n/g, "<br>");
  }, [html, sanitized]);

  if (!renderedHtml.trim()) {
    return (
      <Text className="text-sm text-grey-500">
        Nội dung đang được cập nhật.
      </Text>
    );
  }

  return (
    <RenderHtml
      contentWidth={Math.max(1, contentWidth)}
      source={{ html: renderedHtml }}
      baseStyle={{
        color: "#454F5B",
        fontSize: 15,
        lineHeight: 26,
      }}
      tagsStyles={tagStyles}
      systemFonts={defaultSystemFonts}
      renderersProps={{
        a: {
          onPress: (_event, href) => {
            const url = safeContentUrl(href);

            if (!url) return;

            void Linking.openURL(url).catch(() => {
              Toast.show({
                type: "error",
                text1: "Không mở được liên kết",
              });
            });
          },
        },
      }}
    />
  );
}
