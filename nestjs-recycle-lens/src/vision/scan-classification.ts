import { Prisma, ContentStatus } from '@prisma/client';

interface StoredClassification {
  result: Prisma.JsonValue;
  wasteSlug: string | null;
  wasteItem: {
    slug: string;
    articleId: string;
    article: {
      title: string;
      status: ContentStatus;
      deletedAt: Date | null;
      category: { status: ContentStatus; deletedAt: Date | null } | null;
    };
  } | null;
}

export function scanClassification(scan: StoredClassification | null) {
  const result = scan?.result;
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return null;
  const status = result.status;
  if (typeof status !== 'string') return null;
  if (
    !['recognized', 'matched', 'uncertain', 'unknown', 'hazardous'].includes(
      status,
    )
  )
    return null;
  const item = scan?.wasteItem;
  const visible =
    item &&
    item.article.status === 'active' &&
    !item.article.deletedAt &&
    (!item.article.category ||
      (item.article.category.status === 'active' &&
        !item.article.category.deletedAt));
  // Foreign key, never legacy title or provider prose, identifies a discovery.
  const linked = visible && (status === 'matched' || status === 'hazardous');
  return {
    status,
    label: typeof result.label === 'string' ? result.label.slice(0, 200) : null,
    wasteSlug: linked ? item.slug : null,
    articleId: linked ? item.articleId : null,
    wasteName: linked ? item.article.title : null,
  };
}
