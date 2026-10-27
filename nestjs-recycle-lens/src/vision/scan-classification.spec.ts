import { scanClassification } from './scan-classification';

const item = {
  slug: 'pet-bottle',
  articleId: 'canonical-id',
  article: {
    title: 'PET',
    status: 'active' as const,
    deletedAt: null,
    category: { status: 'active' as const, deletedAt: null },
  },
};
describe('Scan history classification projection', () => {
  it('retains nullable legacy results rather than inferring from a title', () => {
    expect(scanClassification(null)).toBeNull();
  });
  it('recognized AI results have a history label without a fabricated library link', () => {
    expect(
      scanClassification({
        result: { status: 'recognized', label: 'Coffee cup' },
        wasteSlug: null,
        wasteItem: null,
      }),
    ).toMatchObject({
      status: 'recognized',
      label: 'Coffee cup',
      articleId: null,
    });
  });
  it.each([{}, [], { status: ['matched'] }, { status: 'invented' }])(
    'rejects malformed stored classification %j',
    (result) => {
      expect(
        scanClassification({ result, wasteSlug: null, wasteItem: null }),
      ).toBeNull();
    },
  );
  it('links only the canonical foreign key, never an AI-supplied ID', () => {
    expect(
      scanClassification({
        result: {
          status: 'matched',
          label: 'PET',
          matchedWaste: { articleId: 'bad' },
        },
        wasteSlug: item.slug,
        wasteItem: item,
      }),
    ).toMatchObject({ articleId: 'canonical-id', wasteSlug: item.slug });
  });
  it('does not link uncertain results even when corrupted data has a foreign key', () => {
    expect(
      scanClassification({
        result: { status: 'uncertain' },
        wasteSlug: item.slug,
        wasteItem: item,
      }),
    ).toMatchObject({ status: 'uncertain', articleId: null, wasteSlug: null });
  });
  it('hides canonical links after the category becomes inactive', () => {
    expect(
      scanClassification({
        result: { status: 'matched' },
        wasteSlug: item.slug,
        wasteItem: {
          ...item,
          article: {
            ...item.article,
            category: { status: 'inactive', deletedAt: null },
          },
        },
      }),
    ).toMatchObject({ articleId: null });
  });
});
