import { UnprocessableEntityException } from '@nestjs/common';
import { MATERIALS, normalizeTerm } from 'src/waste/data/waste.dataset';
import { NormalizedScan, WasteSummary } from 'src/waste/waste.types';
import { sanitizeVisionHtml, visionText } from './vision-text';

export const DISCLAIMER =
  'Kết quả và gợi ý của AI chưa được xác minh. Kiểm tra vật liệu và quy tắc địa phương trước xử lý; hướng dẫn thư viện là nguồn tham khảo riêng.';
export const UNKNOWN_ADVICE = [
  'Chưa xác định được vật liệu: không bỏ vào luồng tái chế theo dự đoán.',
  'Chụp một vật, đủ sáng và nhãn vật liệu rõ; tra thư viện hoặc hỏi đơn vị thu gom.',
  'Nếu nghi có pin, hóa chất hay vật sắc nhọn, không mở, đốt, tráng hoặc xử lý bằng tay trần.',
];
export const HAZARD_ADVICE = [
  'Có khả năng nguy hại: không đưa vào thùng tái chế chung.',
  'Không tháo, nghiền, đốt, ngâm, tráng hoặc trộn chất; giữ trẻ em/vật nuôi tránh xa.',
  'Nếu rò rỉ, phồng, nóng, có mùi lạ hoặc vật sắc nhọn: tránh tiếp xúc và liên hệ đơn vị chuyên trách; khi cháy gọi cứu hỏa.',
];
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function text(value: unknown, max = 160): string | null {
  return visionText(value, max);
}
export function normalizeVisionResult(
  raw: unknown,
  catalog: (WasteSummary & { aliases: string[] })[],
  libraryAvailable = true,
): NormalizedScan {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.length > 64000)
      throw new UnprocessableEntityException('AI response is too large');
    try {
      parsed = JSON.parse(
        raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''),
      );
    } catch {
      throw new UnprocessableEntityException(
        'AI trả kết quả không hợp lệ; vui lòng thử ảnh khác.',
      );
    }
  }
  const data = record(parsed);
  if (!data)
    throw new UnprocessableEntityException('AI trả kết quả không hợp lệ');
  if (data.error || data.success === false || data.status === 'error')
    throw new UnprocessableEntityException('AI báo phân tích thất bại');
  const named = text(data.label) ?? text(data.title);
  const label = named ?? text(data.wasteClass);
  const declared = text(data.wasteClass);
  if (!label)
    throw new UnprocessableEntityException(
      'AI không cung cấp nhận dạng hợp lệ',
    );
  const content = text(data.content, 16000);
  const observations = text(data.observations, 2000);
  if (data.status !== undefined && typeof data.status !== 'string')
    throw new UnprocessableEntityException('AI trả trạng thái không hợp lệ');
  if (
    data.items !== undefined &&
    (!Array.isArray(data.items) || data.items.length > 10)
  )
    throw new UnprocessableEntityException(
      'AI trả danh sách nhận dạng không hợp lệ',
    );
  for (const flag of ['uncertain', 'hazardous']) {
    if (data[flag] !== undefined && typeof data[flag] !== 'boolean')
      throw new UnprocessableEntityException(
        'AI trả cờ nhận dạng không hợp lệ',
      );
  }
  const names: string[] = [declared ?? label];
  const items: string[] = [];
  if (Array.isArray(data.items)) {
    for (const value of data.items.slice(0, 10)) {
      const obj = record(value);
      const name = text(obj?.wasteClass) ?? text(obj?.label) ?? text(value);
      if (name) names.push(name);
      const itemLabel = text(obj?.label) ?? text(obj?.title) ?? name;
      if (itemLabel) items.push(itemLabel);
    }
  }
  // Exact aliases only. Broad keywords, fuzzy substrings and AI prose do not imply a material.
  const candidates = catalog.filter((item) =>
    names.some((name) =>
      [item.slug, item.name, item.nameEn, ...item.aliases].some(
        (alias) => normalizeTerm(alias) === normalizeTerm(name),
      ),
    ),
  );
  const score =
    typeof data.confidence === 'number' &&
    Number.isFinite(data.confidence) &&
    data.confidence >= 0 &&
    data.confidence <= 1
      ? data.confidence
      : null;
  const multi = Array.isArray(data.items) && data.items.length > 1;
  const material = text(data.material);
  const materialId = material
    ? (MATERIALS.find((entry) =>
        [entry.id, entry.name].some(
          (alias) => normalizeTerm(alias) === normalizeTerm(material),
        ),
      )?.id ?? material)
    : null;
  const materialConflict =
    !!materialId &&
    candidates.length === 1 &&
    !candidates[0].materials.some(
      (m) => normalizeTerm(m) === normalizeTerm(materialId),
    );
  const uncertain =
    data.uncertain === true ||
    data.status === 'uncertain' ||
    (score !== null && score < 0.7) ||
    multi;
  const unrecognized =
    data.status === 'unknown' ||
    (!named && normalizeTerm(declared ?? '') === 'unknown') ||
    [
      'unknown',
      'unknown item',
      'unknown object',
      'unidentified',
      'unrecognized',
      'chua xac dinh',
      'mot vat chua xac dinh',
      'khong xac dinh',
      'khong nhan dang duoc',
      'chua nhan dang duoc',
    ].includes(normalizeTerm(label));
  const potentiallyHazardous =
    data.hazardous === true ||
    candidates.some((item) => item.guidance.hazardous) ||
    /\b(battery|batteries|pin|ac quy|chemical|pesticide|needle|syringe|kim tiem|thuy ngan|mercury|fluorescent|dung moi|thuoc tru sau)\b/.test(
      normalizeTerm(
        [
          ...names,
          label,
          material ?? '',
          observations ?? '',
          content ?? '',
        ].join(' '),
      ),
    );
  const selected =
    candidates.length === 1 &&
    !uncertain &&
    !unrecognized &&
    !materialConflict &&
    (!potentiallyHazardous || candidates[0].guidance.hazardous)
      ? candidates[0]
      : null;
  const matchedWaste: Omit<WasteSummary, 'guidance'> | null = selected
    ? {
        slug: selected.slug,
        articleId: selected.articleId,
        name: selected.name,
        nameEn: selected.nameEn,
        materials: selected.materials,
      }
    : null;
  // AI hazard flags override any ordinary disposal/preparation guidance, even if a regular class matches.
  const guidance =
    selected && (!potentiallyHazardous || selected.guidance.hazardous)
      ? selected.guidance
      : null;
  return {
    schemaVersion: 1,
    status: potentiallyHazardous
      ? 'hazardous'
      : uncertain
        ? 'uncertain'
        : selected
          ? 'matched'
          : unrecognized
            ? 'unknown'
            : 'recognized',
    label,
    recognitionStatus: uncertain
      ? 'uncertain'
      : unrecognized
        ? 'unknown'
        : 'recognized',
    material,
    items,
    // Unstructured legacy prose may mix observations and disposal suggestions.
    // Withhold it for suspected hazards instead of exposing unsafe instructions.
    content: potentiallyHazardous ? null : content,
    observations,
    libraryMatchStatus: !libraryAvailable
      ? 'unavailable'
      : selected
        ? 'matched'
        : candidates.length
          ? 'withheld'
          : 'not_found',
    modelReportedConfidence: score,
    confidenceMeaning:
      score === null ? 'not_provided' : 'uncalibrated_model_score',
    potentiallyHazardous,
    reasons: [
      ...(candidates.length === 0 ? ['no_exact_library_match'] : []),
      ...(data.uncertain === true || data.status === 'uncertain'
        ? ['provider_uncertain']
        : []),
      ...(score !== null && score < 0.7 ? ['low_model_score'] : []),
      ...(multi ? ['multiple_items'] : []),
      ...(materialConflict ? ['material_conflict'] : []),
      ...(candidates.length > 1 ? ['ambiguous_library_match'] : []),
    ],
    matchedWaste,
    candidates: candidates
      .filter((item) => !potentiallyHazardous || item.guidance.hazardous)
      .map((item) => ({
        slug: item.slug,
        articleId: item.articleId,
        name: item.name,
      })),
    guidance,
    safetyAdvice: potentiallyHazardous
      ? HAZARD_ADVICE
      : selected && !uncertain
        ? [
            'Chỉ áp dụng hướng dẫn sau khi kiểm tra đúng vật liệu, bao bì và nơi thu gom.',
            'Nếu có dấu hiệu hóa chất, pin hoặc vật sắc nhọn, dùng điểm thu gom chuyên biệt.',
          ]
        : uncertain || unrecognized
          ? UNKNOWN_ADVICE
          : [
              'Gợi ý xử lý của AI chưa được xác minh; kiểm tra vật liệu và nơi thu gom trước khi làm theo.',
              'Không đốt, trộn hóa chất hoặc tháo mở vật lạ theo gợi ý AI; tránh tiếp xúc nếu nghi nguy hại.',
            ],
    disclaimer: DISCLAIMER,
  };
}

// Live provider contract: JSON title/content. The canonical normalizer above is
// retained for existing curated seed/history policy; live scans never load a catalog.
export function normalizeProviderResult(raw: unknown): NormalizedScan & {
  content: string;
  contentFormat: 'html';
  source: 'third_party_vision';
} {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.length > 100000)
      throw new UnprocessableEntityException('AI response is too large');
    try {
      parsed = JSON.parse(
        raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''),
      );
    } catch {
      throw new UnprocessableEntityException('AI trả kết quả không hợp lệ');
    }
  }
  const data = record(parsed);
  if (!data || !text(data.title))
    throw new UnprocessableEntityException(
      'AI không cung cấp tiêu đề phân tích',
    );
  const content = sanitizeVisionHtml(data.content);
  const normalized = normalizeVisionResult(
    { ...data, label: data.title, content: undefined },
    [],
  );
  return {
    ...normalized,
    content,
    contentFormat: 'html',
    source: 'third_party_vision',
    libraryMatchStatus: 'not_requested',
    reasons: normalized.reasons.filter(
      (reason) => reason !== 'no_exact_library_match',
    ),
    disclaimer:
      'AI có thể sai. Kiểm tra vật liệu, cảnh báo và quy định thu gom địa phương trước khi xử lý.',
  };
}
