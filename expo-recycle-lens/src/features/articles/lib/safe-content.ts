import { parseDocument, DomUtils } from "htmlparser2";

const allowed = new Set([
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
const discarded = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "video",
  "audio",
  "img",
  "template",
]);
function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
export function safeContentUrl(value: string): string | null {
  try {
    if (!/^https?:\/\//i.test(value.trim())) return null;
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
// Parse first; a regex alone cannot establish HTML/attribute boundaries.
export function sanitizeArticleHtml(html: string): string {
  const doc = parseDocument(html);
  const render = (node: (typeof doc.children)[number], depth = 0): string => {
    if (depth > 100) return "";
    if (DomUtils.isText(node)) return escape(node.data);
    if (!DomUtils.isTag(node)) return "";
    const name = node.name.toLowerCase();
    if (discarded.has(name)) return "";
    const content = node.children
      .map((child) => render(child, depth + 1))
      .join("");
    if (!allowed.has(name)) return content;
    const href = name === "a" ? safeContentUrl(node.attribs.href ?? "") : null;
    const attrs = href ? ` href="${escape(href)}"` : "";
    return name === "br" || name === "hr"
      ? `<${name}>`
      : `<${name}${attrs}>${content}</${name}>`;
  };
  return doc.children.map((node) => render(node)).join("");
}

export function articlePlainText(html: string, max = 16000): string {
  const doc = parseDocument(sanitizeArticleHtml(html));
  const text = (nodes: typeof doc.children): string =>
    nodes
      .map((node) =>
        DomUtils.isText(node)
          ? node.data
          : DomUtils.hasChildren(node)
            ? ` ${text(node.children)} `
            : "",
      )
      .join("");
  return text(doc.children).replace(/\s+/g, " ").trim().slice(0, max);
}

export function articleShareMessage(article: {
  title: string;
  description?: string | null;
  content: string;
}): string {
  return `${article.title}\n\n${articlePlainText(article.description || article.content, 1500)}\n\nChia sẻ từ RecycleLens`;
}
