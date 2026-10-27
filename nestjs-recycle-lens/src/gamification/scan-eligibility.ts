import { Prisma } from '@prisma/client';

// Successful standalone provider scans earn scan XP, never canonical discovery XP.
// This marker is set by the trusted backend only, not accepted from a client DTO.
export function eligibleScanXpResult(
  result: Prisma.JsonValue,
  wasteSlug: string | null,
) {
  if (eligibleScanResult(result, wasteSlug)) return true;
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return false;
  return (
    result.schemaVersion === 1 &&
    result.source === 'third_party_vision' &&
    result.contentFormat === 'html' &&
    result.recognitionStatus === 'recognized' &&
    (result.status === 'recognized' || result.status === 'hazardous') &&
    Array.isArray(result.reasons) &&
    !result.reasons.length &&
    typeof result.label === 'string' &&
    !!result.label.trim() &&
    typeof result.content === 'string' &&
    !!result.content.trim()
  );
}

export function eligibleScanResult(
  result: Prisma.JsonValue,
  wasteSlug: string | null,
) {
  if (
    !wasteSlug ||
    !result ||
    typeof result !== 'object' ||
    Array.isArray(result)
  )
    return false;
  const matched = result.matchedWaste;
  return (
    result.schemaVersion === 1 &&
    (result.status === 'matched' || result.status === 'hazardous') &&
    Array.isArray(result.reasons) &&
    result.reasons.length === 0 &&
    !!matched &&
    typeof matched === 'object' &&
    !Array.isArray(matched) &&
    matched.slug === wasteSlug
  );
}
// SQL migration uses the same historical eligibility predicate. Keep regression tests in sync.
export const eligibleScanWhere: Prisma.ScanAnalysisWhereInput = {
  AND: [
    { result: { path: ['schemaVersion'], equals: 1 } },
    {
      OR: [
        { result: { path: ['status'], equals: 'matched' } },
        { result: { path: ['status'], equals: 'hazardous' } },
      ],
    },
    { result: { path: ['reasons'], equals: [] } },
  ],
};
