import {
  safeContentUrl,
  sanitizeArticleHtml,
} from "@/features/articles/lib/safe-content";
import { DomUtils, parseDocument } from "htmlparser2";

type HtmlNode = ReturnType<typeof parseDocument>["children"][number];

export interface ScanContentSection {
  id: string;
  title: string;
  html: string;
}

export interface ParsedScanContent {
  overview: {
    category?: string;
    group?: string;
    binColor?: string;
  };
  introHtml: string;
  sections: ScanContentSection[];
}

const SAFE_TAGS = new Set([
  "p",
  "div",
  "span",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "blockquote",
  "a",
  "hr",
  "pre",
  "code",
]);

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Serialize DOM đã sanitize, không khôi phục thuộc tính nguy hiểm.
function serializeNode(node: HtmlNode): string {
  if (DomUtils.isText(node)) {
    return escapeHtml(node.data);
  }

  if (!DomUtils.isTag(node)) {
    return "";
  }

  const name = node.name.toLowerCase();

  const content = node.children.map(serializeNode).join("");

  if (!SAFE_TAGS.has(name)) {
    return content;
  }

  if (name === "br" || name === "hr") {
    return `<${name}>`;
  }

  let attrs = "";

  if (name === "a") {
    const href = safeContentUrl(node.attribs.href ?? "");

    if (href) {
      attrs = ` href="${escapeHtml(href)}"`;
    }
  }

  return `<${name}${attrs}>${content}</${name}>`;
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[:：]/g, "")
    .trim()
    .toLowerCase();
}

function extractOverview(node: HtmlNode): {
  key: "category" | "group" | "binColor";
  value: string;
} | null {
  if (!DomUtils.isTag(node) || node.name !== "p") {
    return null;
  }

  const first = node.children.find((child) => {
    if (DomUtils.isText(child)) {
      return child.data.trim().length > 0;
    }
    return DomUtils.isTag(child);
  });

  if (
    !first ||
    !DomUtils.isTag(first) ||
    !["strong", "b"].includes(first.name)
  ) {
    return null;
  }

  const label = DomUtils.textContent(first).trim();
  const fullText = DomUtils.textContent(node).trim();

  if (!fullText.startsWith(label)) {
    return null;
  }

  const value = fullText
    .slice(label.length)
    .replace(/^\s*[:：]\s*/, "")
    .trim();

  if (!value) {
    return null;
  }

  const normalized = normalizeLabel(label);

  if (normalized === "danh muc") {
    return { key: "category", value };
  }

  if (normalized === "nhom rac") {
    return { key: "group", value };
  }

  if (normalized === "mau thung rac") {
    return { key: "binColor", value };
  }

  return null;
}

function cleanHeading(value: string): string {
  return value
    .replace(/^\s*\d+\s*[.)．-]\s*/, "")
    .replace(/:\s*$/, "")
    .trim();
}

export function parseScanResultContent(rawHtml: string): ParsedScanContent {
  const html = sanitizeArticleHtml(rawHtml);
  const document = parseDocument(html);

  const result: ParsedScanContent = {
    overview: {},
    introHtml: "",
    sections: [],
  };

  let currentSection: ScanContentSection | null = null;

  for (const node of document.children) {
    if (DomUtils.isTag(node) && HEADING_TAGS.has(node.name.toLowerCase())) {
      const title = cleanHeading(DomUtils.textContent(node));

      if (title) {
        currentSection = {
          id: `section-${result.sections.length + 1}`,
          title,
          html: "",
        };

        result.sections.push(currentSection);
        continue;
      }
    }

    // Chỉ tách thông tin tổng quan trước section đầu tiên.
    if (!currentSection) {
      const overview = extractOverview(node);

      if (overview) {
        result.overview[overview.key] = overview.value;
        continue;
      }
    }

    // Giữ nguyên nội dung và thứ tự các thẻ còn lại.
    const nodeHtml = serializeNode(node);

    if (currentSection) {
      currentSection.html += nodeHtml;
    } else {
      result.introHtml += nodeHtml;
    }
  }

  return result;
}
