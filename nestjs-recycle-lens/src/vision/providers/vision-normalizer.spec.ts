import {
  normalizeVisionResult,
  normalizeProviderResult,
} from './vision-normalizer';
import {
  catalogId,
  WASTE_DATASET,
  MATERIALS,
  WASTE_CATEGORIES,
  normalizeTerm,
} from 'src/waste/data/waste.dataset';
const catalog = WASTE_DATASET.map((item) => ({
  slug: item.slug,
  articleId: catalogId('article', item.slug),
  name: item.name,
  nameEn: item.nameEn,
  materials: item.materials,
  aliases: item.aliases,
  guidance: item.guidance,
}));
describe('canonical classification and safety', () => {
  it('preserves provider educational markup while removing executable content', () => {
    const result = normalizeProviderResult(
      JSON.stringify({
        title: 'Lá cây',
        content:
          '<p><strong>Danh mục:</strong> Hữu cơ</p><h3>Hướng dẫn</h3><ul><li>Ủ compost</li></ul><a href="javascript:alert(1)" onclick="steal()">Tham khảo</a><script>steal()</script><img src="https://private.invalid/image">',
      }),
    );
    expect(result.content).toBe(
      '<p><strong>Danh mục:</strong> Hữu cơ</p><h3>Hướng dẫn</h3><ul><li>Ủ compost</li></ul><a>Tham khảo</a>',
    );
    expect(result.matchedWaste).toBeNull();
    expect(result.guidance).toBeNull();
    expect(result.libraryMatchStatus).toBe('not_requested');
  });
  it('retains hazardous provider content with safety metadata instead of replacing it', () => {
    const result = normalizeProviderResult({
      title: 'Pin',
      content: '<h3>Cảnh báo</h3><p>Giữ pin nguyên vẹn.</p>',
    });
    expect(result.status).toBe('hazardous');
    expect(result.content).toContain('<h3>Cảnh báo</h3>');
    expect(result.guidance).toBeNull();
  });
  it.each([
    { title: 'PET' },
    { label: 'PET', content: '<p>Text</p>' },
    { title: 'PET', content: '<script>fake()</script>' },
    { title: 'PET', content: 42 },
    { title: 'PET', content: 'x'.repeat(64001) },
    { title: 'PET', content: '<p>Text</p>', success: false },
  ])('rejects malformed provider title/content contract %j', (raw) => {
    expect(() => normalizeProviderResult(raw)).toThrow();
  });
  it('has 18 stable classes, valid material/category keys and provenance with local uncertainty', () => {
    expect(catalog).toHaveLength(18);
    expect(new Set(catalog.map((item) => item.slug)).size).toBe(18);
    const aliases = new Map<string, string>();
    for (const item of WASTE_DATASET) {
      expect(WASTE_CATEGORIES.some((c) => c.key === item.category)).toBe(true);
      expect(item.guidance.disposal.length).toBeGreaterThan(0);
      expect(item.guidance.preparation.length).toBeGreaterThan(0);
      expect(item.guidance.provenance[0].url).toMatch(
        /^https:\/\/www\.(epa|fda).gov\//,
      );
      expect(item.guidance.localContext).toContain('Việt Nam');
      expect(item.guidance.illustration.alt).toBeTruthy();
      for (const material of item.materials)
        expect(MATERIALS.some((m) => m.id === material)).toBe(true);
      for (const alias of item.aliases) {
        const term = normalizeTerm(alias);
        expect(aliases.get(term) ?? item.slug).toBe(item.slug);
        aliases.set(term, item.slug);
      }
    }
  });
  it.each(['pet-bottle', 'PET bottle', 'CHAI NHỰA PET', 'chai nhua pet'])(
    'exact-matches %s without inventing confidence',
    (label) => {
      const result = normalizeVisionResult(JSON.stringify({ label }), catalog);
      expect(result.matchedWaste?.slug).toBe('pet-bottle');
      expect(result.modelReportedConfidence).toBeNull();
      expect(result.confidenceMeaning).toBe('not_provided');
      expect(result.guidance).toEqual(catalog[0].guidance);
    },
  );
  it('normalizes a Vietnamese material name without broadening identity matching', () => {
    const result = normalizeVisionResult(
      { wasteClass: 'pet-bottle', material: 'nhựa' },
      catalog,
    );
    expect(result.status).toBe('matched');
    expect(result.matchedWaste?.materials).toEqual(['plastic']);
  });
  it('retains AI recognition without promoting a fuzzy label to a canonical identity', () => {
    const result = normalizeVisionResult({ label: 'plastic bottle' }, catalog);
    expect(result.status).toBe('recognized');
    expect(result.recognitionStatus).toBe('recognized');
    expect(result.matchedWaste).toBeNull();
    expect(result.label).toBe('plastic bottle');
  });
  it.each([
    { confidence: 0.2 },
    { uncertain: true },
    { status: 'uncertain' },
    { items: ['PET bottle', 'glass bottle'] },
  ])('withholds item-specific instructions for uncertainty %j', (extra) => {
    const result = normalizeVisionResult(
      { label: 'PET bottle', ...extra },
      catalog,
    );
    expect(result.status).toBe('uncertain');
    expect(result.guidance).toBeNull();
    expect(result.matchedWaste).toBeNull();
    expect(result.candidates.length).toBeGreaterThan(0);
  });
  it('a library material conflict withholds enrichment, not the AI findings', () => {
    const result = normalizeVisionResult(
      { label: 'PET bottle', material: 'glass' },
      catalog,
    );
    expect(result.status).toBe('recognized');
    expect(result.material).toBe('glass');
    expect(result.libraryMatchStatus).toBe('withheld');
    expect(result.matchedWaste).toBeNull();
    expect(result.guidance).toBeNull();
  });
  it('keeps legacy AI title/content without requiring a library or inventing material/confidence', () => {
    const result = normalizeVisionResult(
      {
        title: 'Hộp đựng cà phê',
        content: '<p>Vật có hai lớp.</p><script>unsafe()</script>',
      },
      [],
    );
    expect(result).toMatchObject({
      label: 'Hộp đựng cà phê',
      content: 'Vật có hai lớp.',
      status: 'recognized',
      recognitionStatus: 'recognized',
      material: null,
      modelReportedConfidence: null,
      matchedWaste: null,
      libraryMatchStatus: 'not_found',
    });
    expect(JSON.stringify(result)).not.toContain('unsafe');
  });
  it('an unavailable library does not turn AI recognition into unknown', () => {
    expect(
      normalizeVisionResult(
        {
          label: 'Mảnh bao bì',
          material: 'mixed',
          observations: 'Bề mặt nhiều lớp',
        },
        [],
        false,
      ),
    ).toMatchObject({
      status: 'recognized',
      material: 'mixed',
      observations: 'Bề mặt nhiều lớp',
      libraryMatchStatus: 'unavailable',
      matchedWaste: null,
    });
  });
  it('explicit provider unknown is distinct from no library match', () => {
    expect(
      normalizeVisionResult(
        { wasteClass: 'unknown', label: 'Chưa xác định' },
        [],
      ).recognitionStatus,
    ).toBe('unknown');
  });
  it('an unknown canonical class does not erase a meaningful AI object name', () => {
    const result = normalizeVisionResult(
      { wasteClass: 'unknown', label: 'Hộp nhiều lớp', material: 'mixed' },
      catalog,
    );
    expect(result).toMatchObject({
      status: 'recognized',
      recognitionStatus: 'recognized',
      label: 'Hộp nhiều lớp',
      material: 'mixed',
      matchedWaste: null,
    });
  });
  it.each([
    { title: 'PET', content: 42 },
    { label: 'PET', material: {} },
    { label: 'PET', hazardous: 'no' },
    { label: 'PET', content: 'x'.repeat(16001) },
    { error: 'failed', title: 'PET' },
  ])('rejects malformed AI findings, not a library miss', (raw) => {
    expect(() => normalizeVisionResult(raw, [])).toThrow();
  });
  it('preserves score only as an uncalibrated model report', () => {
    const result = normalizeVisionResult(
      { wasteClass: 'pet-bottle', confidence: 0.9 },
      catalog,
    );
    expect(result.modelReportedConfidence).toBe(0.9);
    expect(result.confidenceMeaning).toBe('uncalibrated_model_score');
  });
  it.each([95, -1, '95%', NaN])(
    'does not fabricate/convert invalid confidence %s',
    (confidence) => {
      expect(
        normalizeVisionResult({ label: 'PET bottle', confidence }, catalog)
          .modelReportedConfidence,
      ).toBeNull();
    },
  );
  it('uses hazardous canonical guidance for battery and never AI instructions', () => {
    const result = normalizeVisionResult(
      { label: 'pin', content: '<p>Burn it</p>', instructions: 'Burn it' },
      catalog,
    );
    expect(result.status).toBe('hazardous');
    expect(result.guidance?.hazardous).toBe(true);
    expect(JSON.stringify(result)).not.toContain('Burn it');
  });
  it('hazard flag overrides regular material guidance', () => {
    const result = normalizeVisionResult(
      { wasteClass: 'pet-bottle', hazardous: true },
      catalog,
    );
    expect(result.status).toBe('hazardous');
    expect(result.guidance).toBeNull();
    expect(result.matchedWaste).toBeNull();
    expect(result.candidates).toEqual([]);
    expect(result.safetyAdvice.join()).toContain('không');
  });
  it('unknown hazardous label remains hazardous without a made-up match', () => {
    const result = normalizeVisionResult(
      {
        wasteClass: 'unknown',
        label: 'damaged lithium battery',
        confidence: 0.1,
      },
      catalog,
    );
    expect(result.status).toBe('hazardous');
    expect(result.matchedWaste).toBeNull();
    expect(result.guidance).toBeNull();
  });
  it('handles fenced legacy JSON, treating title as a suggestion, not disposal HTML', () => {
    const result = normalizeVisionResult(
      '```json\n{"title":"Chai nhựa PET","content":"<script>unsafe</script>"}\n```',
      catalog,
    );
    expect(result.label).toBe('Chai nhựa PET');
    expect(JSON.stringify(result)).not.toContain('unsafe');
  });
  it.each(['not-json', '{}', '[]', '{"label":42}', null])(
    'fails closed on invalid response %s',
    (raw) => {
      expect(() => normalizeVisionResult(raw, catalog)).toThrow();
    },
  );
});
