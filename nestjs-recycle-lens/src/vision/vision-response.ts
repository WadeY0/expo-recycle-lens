import { Prisma } from '@prisma/client';

// Additive fields shared by POST and the owner-scoped detail API. Article
// remains the persistence wrapper; its ID is always the scan history ID.
export function visionResultFields(article: {
  id: string;
  image: string | null;
  createdAt: Date;
  scanAnalysis: {
    result: Prisma.JsonValue;
    provider: string | null;
    model: string | null;
  } | null;
}) {
  const analysis = article.scanAnalysis?.result ?? null;
  const matchedWaste =
    analysis && typeof analysis === 'object' && !Array.isArray(analysis)
      ? (analysis.matchedWaste ?? null)
      : null;
  return {
    id: article.id,
    imageUrl: article.image,
    createdAt: article.createdAt,
    analysis,
    matchedWaste,
    provider: article.scanAnalysis?.provider ?? null,
    model: article.scanAnalysis?.model ?? null,
  };
}
