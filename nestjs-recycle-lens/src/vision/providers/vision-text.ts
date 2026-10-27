import { UnprocessableEntityException } from '@nestjs/common';
import { parseDocument, DomUtils } from 'htmlparser2';

// Plain text for labels and legacy canonical seed normalization.
export function visionText(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > max)
    throw new UnprocessableEntityException(
      'AI trả trường nội dung không hợp lệ',
    );
  const doc = parseDocument(value);
  const discarded = new Set([
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'svg',
    'math',
    'template',
  ]);
  const read = (node: (typeof doc.children)[number], depth = 0): string => {
    if (depth > 100) return '';
    if (DomUtils.isText(node)) return node.data;
    if (!DomUtils.isTag(node) || discarded.has(node.name.toLowerCase()))
      return '';
    return ` ${node.children.map((child) => read(child, depth + 1)).join('')} `;
  };
  return (
    doc.children
      .map((node) => read(node))
      .join('')
      .replace(/\s+/g, ' ')
      .trim() || null
  );
}

// Preserve educational HTML, stripping active content and all unsafe attributes.
// Same allowlist as Expo's existing article renderer; no remote images/resources.
export function sanitizeVisionHtml(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 64000)
    throw new UnprocessableEntityException('AI trả nội dung HTML không hợp lệ');
  const allowed = new Set([
    'p',
    'div',
    'span',
    'br',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'blockquote',
    'a',
    'hr',
    'pre',
    'code',
  ]);
  const discarded = new Set([
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'svg',
    'math',
    'form',
    'input',
    'button',
    'textarea',
    'select',
    'video',
    'audio',
    'img',
    'template',
  ]);
  const escape = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const doc = parseDocument(value);
  const render = (node: (typeof doc.children)[number], depth = 0): string => {
    if (depth > 100) return '';
    if (DomUtils.isText(node)) return escape(node.data);
    if (!DomUtils.isTag(node)) return '';
    const name = node.name.toLowerCase();
    if (discarded.has(name)) return '';
    const content = node.children
      .map((child) => render(child, depth + 1))
      .join('');
    if (!allowed.has(name)) return content;
    let attrs = '';
    if (name === 'a' && /^https?:\/\//i.test(node.attribs.href?.trim() ?? '')) {
      try {
        const url = new URL(node.attribs.href.trim());
        if (
          ['http:', 'https:'].includes(url.protocol) &&
          !url.username &&
          !url.password
        )
          attrs = ` href="${escape(url.toString())}"`;
      } catch {
        /* Invalid links become text. */
      }
    }
    return name === 'br' || name === 'hr'
      ? `<${name}>`
      : `<${name}${attrs}>${content}</${name}>`;
  };
  const html = doc.children.map((node) => render(node)).join('');
  if (html.length > 64000 || !visionText(html, 64000))
    throw new UnprocessableEntityException(
      'AI không cung cấp nội dung phân tích',
    );
  return html;
}
