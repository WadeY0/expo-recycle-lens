import {
  LEVEL_THRESHOLDS,
  XP_POLICY,
  levelProgress,
  plantState,
} from './gamification.policy';
import { periodsAt } from './gamification.time';
import { eligibleScanResult, eligibleScanXpResult } from './scan-eligibility';
import { Prisma } from '@prisma/client';
import { GamificationService } from './gamification.service';
import { TenantService } from 'src/common/services/tenant.service';

describe('Server gamification policy', () => {
  it('defines all initial rewards centrally', () => {
    expect(XP_POLICY).toEqual({
      scan: 5,
      dailyScanLimit: 5,
      discovery: 20,
      dailyChallenge: 30,
      weeklyChallenge: 100,
      achievement: 0,
      articleOpen: 0,
    });
  });
  it('has strictly increasing cumulative thresholds and deterministic levels 6+', () => {
    expect(LEVEL_THRESHOLDS.slice(0, 7)).toEqual([
      0, 100, 250, 500, 900, 1450, 2150,
    ]);
    LEVEL_THRESHOLDS.slice(1).forEach((threshold, i) =>
      expect(threshold).toBeGreaterThan(LEVEL_THRESHOLDS[i]),
    );
  });
  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [249, 2],
    [250, 3],
    [500, 4],
    [899, 4],
    [900, 5],
    [1450, 6],
  ])('maps %i XP to level %i', (xp, level) => {
    const result = levelProgress(xp);
    expect(result.level).toBe(level);
    expect(result.progressPercent).toBeGreaterThanOrEqual(0);
    expect(result.progressPercent).toBeLessThan(100);
  });
  it('handles configured max level without division by zero', () => {
    expect(levelProgress(LEVEL_THRESHOLDS[99] + 99)).toMatchObject({
      level: 100,
      nextLevelXp: null,
      progressPercent: 100,
    });
  });
  it.each([-1, 1.5, NaN, Infinity])('rejects invalid XP %s', (xp) =>
    expect(() => levelProgress(xp)).toThrow(),
  );
  it.each([
    [1, 'seed'],
    [2, 'sprout'],
    [3, 'young_plant'],
    [4, 'growing_plant'],
    [5, 'mature_plant'],
    [100, 'mature_plant'],
  ])('maps level %i to %s', (level, stage) => {
    expect(plantState(level).stage).toBe(stage);
  });
  it('rolls local day at 17:00 UTC and week on local Monday', () => {
    expect(periodsAt(new Date('2026-10-11T16:59:59.999Z')).daily.key).toBe(
      '2026-10-11',
    );
    const next = periodsAt(new Date('2026-10-11T17:00:00Z'));
    expect(next.daily.key).toBe('2026-10-12');
    expect(next.weekly.key).toBe('2026-10-12');
    expect(next.weekly.start.toISOString()).toBe('2026-10-11T17:00:00.000Z');
    expect(next.weekly.end.toISOString()).toBe('2026-10-18T17:00:00.000Z');
  });
  it('handles year rollover and leap day', () => {
    expect(periodsAt(new Date('2027-01-01T00:00:00Z')).weekly.key).toBe(
      '2026-12-28',
    );
    expect(periodsAt(new Date('2028-02-28T17:00:00Z')).daily.key).toBe(
      '2028-02-29',
    );
  });
});
describe('Persisted scan eligibility', () => {
  it('awards standalone scan eligibility without fabricating canonical discovery', () => {
    const result = {
      schemaVersion: 1,
      source: 'third_party_vision',
      contentFormat: 'html',
      status: 'recognized',
      recognitionStatus: 'recognized',
      reasons: [],
      label: 'Hộp nhiều lớp',
      content: '<p>Phân tích của provider</p>',
      matchedWaste: null,
    };
    expect(eligibleScanXpResult(result, null)).toBe(true);
    expect(eligibleScanResult(result, null)).toBe(false);
    expect(eligibleScanXpResult({ ...result, status: 'hazardous' }, null)).toBe(
      true,
    );
    expect(
      eligibleScanXpResult(
        { ...result, status: 'hazardous', recognitionStatus: 'unknown' },
        null,
      ),
    ).toBe(false);
    for (const status of ['unknown', 'uncertain', 'error'])
      expect(eligibleScanXpResult({ ...result, status }, null)).toBe(false);
    expect(eligibleScanXpResult({ ...result, source: 'client' }, null)).toBe(
      false,
    );
    expect(eligibleScanXpResult({ ...result, content: '' }, null)).toBe(false);
    expect(
      eligibleScanXpResult({ ...result, reasons: ['low_model_score'] }, null),
    ).toBe(false);
  });
  const valid = {
    schemaVersion: 1,
    status: 'matched',
    reasons: [],
    matchedWaste: { slug: 'pet-bottle' },
  };
  it('uses canonical FK rather than label or a model-supplied XP value', () => {
    expect(
      eligibleScanResult(
        { ...valid, label: 'anything', xp: 999 },
        'pet-bottle',
      ),
    ).toBe(true);
    expect(eligibleScanResult(valid, null)).toBe(false);
    expect(eligibleScanResult(valid, 'steel-can')).toBe(false);
  });
  it('allows a clear canonical hazardous identification, not an uncertain hazard', () => {
    expect(
      eligibleScanResult({ ...valid, status: 'hazardous' }, 'pet-bottle'),
    ).toBe(true);
    expect(
      eligibleScanResult(
        { ...valid, status: 'hazardous', reasons: ['low_model_score'] },
        'pet-bottle',
      ),
    ).toBe(false);
  });
  it.each(['unknown', 'uncertain', 'failed', 'invalid'])(
    'rejects status %s',
    (status) =>
      expect(eligibleScanResult({ ...valid, status }, 'pet-bottle')).toBe(
        false,
      ),
  );
  it.each([
    null,
    [],
    'matched',
    { status: 'matched' },
    { ...valid, schemaVersion: 2 },
    { ...valid, reasons: ['multiple_items'] },
    { ...valid, matchedWaste: [] },
  ])('rejects malformed or uncertain normalized result %j', (value) => {
    expect(eligibleScanResult(value as Prisma.JsonValue, 'pet-bottle')).toBe(
      false,
    );
  });
});

describe('Standalone scan XP transaction boundary (mock database)', () => {
  it.each([0, 5])(
    'preserves daily cap and idempotency when already rewarded=%s',
    async (rewarded) => {
      const now = new Date();
      const ledger: { amount: number; kind: string; eventKey: string }[] = [];
      const scan = {
        articleId: 'scan',
        wasteSlug: null,
        wasteItem: null,
        createdAt: now,
        result: {
          schemaVersion: 1,
          source: 'third_party_vision',
          contentFormat: 'html',
          status: 'recognized',
          recognitionStatus: 'recognized',
          reasons: [],
          label: 'Vật do provider nhận dạng',
          content: '<p>Provider HTML</p>',
        },
      };
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(1),
        scanAnalysis: { findFirst: jest.fn().mockResolvedValue(scan) },
        gamificationSettings: {
          findUnique: jest.fn().mockResolvedValue({ activatedAt: new Date(0) }),
        },
        xPTransaction: {
          findUnique: jest.fn(() => Promise.resolve(ledger[0] ?? null)),
          count: jest.fn().mockResolvedValue(rewarded),
          groupBy: jest.fn().mockResolvedValue([]),
          create: jest.fn((input: { data: (typeof ledger)[number] }) => {
            ledger.push(input.data);
            return Promise.resolve(input.data);
          }),
        },
        userGamificationProfile: {
          upsert: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
          findUnique: jest
            .fn()
            .mockResolvedValue({ totalXp: 0, eligibleScans: 1 }),
        },
        wasteDiscovery: {
          findUnique: jest.fn(),
          create: jest.fn(),
          count: jest.fn().mockResolvedValue(0),
        },
        challengeDefinition: { findMany: jest.fn().mockResolvedValue([]) },
        userChallengeProgress: { count: jest.fn().mockResolvedValue(0) },
        achievementDefinition: {
          findMany: jest.fn().mockResolvedValue([
            { key: 'first_scan', metric: 'eligible_scans', target: 1 },
            { key: 'first_discovery', metric: 'discoveries', target: 1 },
          ]),
        },
        userAchievement: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      const service = new GamificationService({} as TenantService);
      await service.processScan(
        tx as unknown as Prisma.TransactionClient,
        'scan',
        'owner',
      );
      await service.processScan(
        tx as unknown as Prisma.TransactionClient,
        'scan',
        'owner',
      );
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({
        amount: rewarded < 5 ? 5 : 0,
        kind: 'scan',
        eventKey: 'scan:scan',
      });
      expect(tx.wasteDiscovery.create).not.toHaveBeenCalled();
      expect(tx.wasteDiscovery.findUnique).not.toHaveBeenCalled();
      expect(tx.userAchievement.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'owner', achievementKey: 'first_scan', unlockedAt: now },
        ],
        skipDuplicates: true,
      });
      expect(tx.scanAnalysis.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            articleId: 'scan',
            article: { createdById: 'owner', type: 'ai_scan', deletedAt: null },
          },
        }),
      );
    },
  );
});
