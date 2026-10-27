import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { App } from 'supertest/types';
import * as sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { ResendProvider } from '../src/common/modules/email/providers/resend.provider';
import { ScanMediaService } from '../src/vision/providers/scan-media.service';
import {
  VisionAiService,
  AiAnalysis,
} from '../src/vision/providers/vision-ai.service';
import { GamificationService } from '../src/gamification/gamification.service';
import { TenantService } from '../src/common/services/tenant.service';
import { seedWaste } from '../src/waste/data/seed-waste';
import { periodsAt } from '../src/gamification/gamification.time';
import { Client } from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function body<T>(res: request.Response): T {
  return JSON.parse(res.text) as T;
}
type Overview = {
  totalXp: number;
  level: number;
  uniqueDiscoveries: number;
  eligibleScans: number;
  activeChallenges: {
    key: string;
    progress: number;
    rewardedAt: string | null;
  }[];
};
describe('Phase 3 PostgreSQL transactions / HTTP security', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let png: Buffer;
  let gamification: GamificationService;
  const jwt = new JwtService();
  const media = {
    upload: jest
      .fn<Promise<{ url: string; publicId: string }>, [Buffer]>()
      .mockImplementation(() =>
        Promise.resolve({
          url: 'https://images.example.invalid/scan.jpg',
          publicId: randomUUID(),
        }),
      ),
    remove: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  };
  const ai = { analyze: jest.fn<Promise<AiAnalysis>, unknown[]>() };
  async function user() {
    const id = randomUUID();
    await prisma.user.create({
      data: {
        id,
        email: `${id}@example.invalid`,
        fullName: 'Phase3',
        password: 'test-only',
        isVerified: true,
      },
    });
    return id;
  }
  function token(id: string, tenantId = 'RECYCLELENS') {
    return jwt.sign(
      { sub: id, tenantId, tokenUse: 'access', tokenVersion: 0 },
      {
        secret: process.env.JWT_SECRET!,
        audience: 'foundation-test',
        issuer: 'foundation-test',
        expiresIn: 3600,
      },
    );
  }
  function http(id: string, path: string) {
    return request(app.getHttpServer())
      .get(path)
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(token(id), { type: 'bearer' });
  }
  function scan(id: string, key: string = randomUUID()) {
    return request(app.getHttpServer())
      .post('/vision/analyze-waste')
      .set('x-tenant-id', 'RECYCLELENS')
      .set('Idempotency-Key', key)
      .auth(token(id), { type: 'bearer' })
      .attach('image', png, { filename: 'scan.png', contentType: 'image/png' });
  }
  async function persisted(
    id: string,
    slug = 'pet-bottle',
    at = new Date(),
    status = 'matched',
    reasons: string[] = [],
  ) {
    return prisma.article.create({
      data: {
        title: 'Canonical fixture',
        content: 'Private',
        type: 'ai_scan',
        status: 'inactive',
        createdById: id,
        createdAt: at,
        scanAnalysis: {
          create: {
            wasteSlug: slug,
            createdAt: at,
            result: {
              schemaVersion: 1,
              status,
              reasons,
              matchedWaste: { slug },
            },
          },
        },
      },
      include: { scanAnalysis: true },
    });
  }
  async function processFixture(id: string, scanId: string) {
    await prisma.$transaction(
      (tx) => gamification.processScan(tx, scanId, id),
      { timeout: 30000, maxWait: 15000 },
    );
  }
  async function consistent(id: string) {
    const profile = await prisma.userGamificationProfile.findUnique({
      where: { userId: id },
    });
    const sum = await prisma.xPTransaction.aggregate({
      where: { userId: id },
      _sum: { amount: true },
    });
    expect(profile?.totalXp ?? 0).toBe(sum._sum.amount ?? 0);
  }
  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.TEST_DATABASE_URL!,
      }),
    });
    await seedWaste(prisma);
    gamification = new GamificationService({
      getPrismaClient: () => Promise.resolve(prisma),
    } as TenantService);
    png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: 'green' },
    })
      .png()
      .toBuffer();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ResendProvider)
      .useValue({ sendOtp: jest.fn() })
      .overrideProvider(ScanMediaService)
      .useValue(media)
      .overrideProvider(VisionAiService)
      .useValue(ai)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });
  beforeEach(() => {
    ai.analyze.mockReset().mockResolvedValue({
      result: {
        wasteClass: 'pet-bottle',
        title: 'Chai PET',
        content: '<p>Provider fixture analysis.</p>',
        material: 'plastic',
        uncertain: false,
      },
      conversationId: null,
      provider: 'test',
      model: 'stub',
    });
    media.remove.mockClear();
  });
  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('returns a zero dashboard for a new user without mutating state on repeated reads', async () => {
    const id = await user();
    for (let i = 0; i < 2; i++)
      expect(
        body<Overview>(await http(id, '/gamification/overview').expect(200)),
      ).toMatchObject({
        totalXp: 0,
        level: 1,
        uniqueDiscoveries: 0,
        eligibleScans: 0,
      });
    expect(
      await prisma.userGamificationProfile.count({ where: { userId: id } }),
    ).toBe(0);
    expect(
      body<{ stage: string }>(await http(id, '/gamification/plant').expect(200))
        .stage,
    ).toBe('seed');
  });
  it('awards standalone persisted owned scan without discovery atomically and repeated HTTP key returns the exact same scan', async () => {
    const id = await user();
    const key = randomUUID();
    const first = body<{ article: { id: string } }>(
      await scan(id, key).expect(201),
    );
    const again = body<{ article: { id: string } }>(
      await scan(id, key).expect(201),
    );
    expect(again.article.id).toBe(first.article.id);
    expect(ai.analyze).toHaveBeenCalledTimes(1);
    await Promise.all([
      processFixture(id, first.article.id),
      processFixture(id, first.article.id),
    ]);
    expect(
      body<Overview>(await http(id, '/gamification/overview').expect(200)),
    ).toMatchObject({ totalXp: 5, uniqueDiscoveries: 0, eligibleScans: 1 });
    expect(await prisma.xPTransaction.count({ where: { userId: id } })).toBe(1);
    const unlocked = await prisma.userAchievement.findMany({
      where: { userId: id },
    });
    expect(unlocked.map((r) => r.achievementKey).sort()).toEqual([
      'first_scan',
    ]);
    await consistent(id);
  });
  it('serializes concurrent requests with the same key and cleans up unused uploaded media', async () => {
    const id = await user();
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 4 }, () => scan(id, key)),
    );
    results.forEach((res) => expect(res.status).toBe(201));
    const ids = results.map(
      (res) => body<{ article: { id: string } }>(res).article.id,
    );
    expect(new Set(ids).size).toBe(1);
    expect(
      await prisma.article.count({
        where: { createdById: id, type: 'ai_scan' },
      }),
    ).toBe(1);
    expect(
      await prisma.xPTransaction.count({ where: { userId: id, kind: 'scan' } }),
    ).toBe(1);
    await consistent(id);
  });
  it('enforces daily reward cap and discovery/challenge uniqueness during simultaneous scans', async () => {
    const id = await user();
    const results = await Promise.all(
      Array.from({ length: 9 }, () => scan(id)),
    );
    results.forEach((res) => expect(res.status).toBe(201));
    const overview = body<Overview>(
      await http(id, '/gamification/overview').expect(200),
    );
    expect(overview).toMatchObject({
      totalXp: 85,
      uniqueDiscoveries: 0,
      eligibleScans: 9,
    });
    expect(
      await prisma.xPTransaction.count({
        where: { userId: id, kind: 'scan', amount: 5 },
      }),
    ).toBe(5);
    expect(
      await prisma.xPTransaction.count({
        where: { userId: id, kind: 'scan', amount: 0 },
      }),
    ).toBe(4);
    expect(await prisma.wasteDiscovery.count({ where: { userId: id } })).toBe(
      0,
    );
    expect(
      await prisma.xPTransaction.count({
        where: { userId: id, kind: 'daily_challenge' },
      }),
    ).toBe(2);
    expect(
      overview.activeChallenges
        .filter((r) => r.key.startsWith('daily'))
        .every((r) => r.rewardedAt),
    ).toBe(true);
    await consistent(id);
  });
  it.each([
    { wasteClass: 'unknown', label: 'Không rõ' },
    { wasteClass: 'pet-bottle', label: 'Có thể PET', uncertain: true },
    { wasteClass: 'pet-bottle', label: 'Có thể PET', confidence: 0.4 },
    { wasteClass: 'unknown', label: 'pin nguy hại', hazardous: true },
  ])(
    'does not reward unknown/uncertain/low confidence/hazardous unknown: %j',
    async (result) => {
      const id = await user();
      ai.analyze.mockResolvedValue({
        result: {
          ...result,
          title: result.label,
          content: '<p>Provider fixture analysis.</p>',
          ...(result.wasteClass === 'unknown' ? { status: 'unknown' } : {}),
        },
        conversationId: null,
        provider: 'test',
        model: null,
      });
      await scan(id).expect(201);
      expect(await prisma.xPTransaction.count({ where: { userId: id } })).toBe(
        0,
      );
      expect(await prisma.wasteDiscovery.count({ where: { userId: id } })).toBe(
        0,
      );
    },
  );
  it('invalid or failed analysis creates neither persisted scan nor XP', async () => {
    const id = await user();
    ai.analyze.mockResolvedValue({
      result: 'invalid json',
      conversationId: null,
      provider: null,
      model: null,
    });
    await scan(id).expect(422);
    expect(await prisma.article.count({ where: { createdById: id } })).toBe(0);
    expect(await prisma.xPTransaction.count({ where: { userId: id } })).toBe(0);
    expect(media.remove).toHaveBeenCalledTimes(1);
  });
  it('recognized hazardous standalone scan earns scan XP without canonical discovery', async () => {
    const id = await user();
    ai.analyze.mockResolvedValue({
      result: {
        wasteClass: 'household-battery',
        title: 'Pin',
        content: '<p>Giữ pin nguyên vẹn.</p>',
        hazardous: true,
      },
      conversationId: null,
      provider: null,
      model: null,
    });
    // Use a slug actually present in the canonical dataset.
    const battery = await prisma.wasteItem.findFirstOrThrow({
      where: { materials: { has: 'battery' } },
    });
    ai.analyze.mockResolvedValue({
      result: {
        wasteClass: battery.slug,
        title: 'Pin',
        content: '<p>Giữ pin nguyên vẹn.</p>',
        hazardous: true,
      },
      conversationId: null,
      provider: null,
      model: null,
    });
    await scan(id).expect(201);
    expect(
      body<Overview>(await http(id, '/gamification/overview').expect(200))
        .totalXp,
    ).toBe(5);
  });
  it('rewards a new class once while other users can discover it independently', async () => {
    const a = await user();
    const b = await user();
    for (const id of [a, a, b]) {
      const saved = await persisted(id);
      await processFixture(id, saved.id);
    }
    expect(
      await prisma.xPTransaction.count({
        where: { userId: a, kind: 'discovery' },
      }),
    ).toBe(1);
    expect(
      body<Overview>(await http(b, '/gamification/overview').expect(200))
        .totalXp,
    ).toBe(25);
    expect(
      body<Overview>(await http(a, '/gamification/overview').expect(200))
        .totalXp,
    ).toBe(30);
  });
  it('rejects another user scan in the internal engine and the HTTP owner endpoint', async () => {
    const owner = await user();
    const other = await user();
    const saved = await persisted(owner);
    await processFixture(other, saved.id);
    expect(await prisma.xPTransaction.count({ where: { userId: other } })).toBe(
      0,
    );
    await http(other, `/vision/my/${saved.id}`).expect(404);
    await http(owner, `/articles/${saved.id}`).expect(404);
  });
  it('cannot award via public client XP/claim/unlock requests; does not expose other progress', async () => {
    const owner = await user();
    const other = await user();
    await scan(owner).expect(201);
    const empty = body<{ data: unknown[] }>(
      await http(other, `/gamification/xp-history?userId=${owner}`).expect(200),
    );
    expect(empty.data).toEqual([]);
    for (const path of ['award', 'claim', 'unlock'])
      await request(app.getHttpServer())
        .post(`/gamification/${path}`)
        .set('x-tenant-id', 'RECYCLELENS')
        .auth(token(owner), { type: 'bearer' })
        .send({ xp: 999999, userId: other })
        .expect(404);
    await request(app.getHttpServer())
      .get('/gamification/overview')
      .set('x-tenant-id', 'RECYCLELENS')
      .expect(401);
    await request(app.getHttpServer())
      .get('/gamification/overview')
      .set('x-tenant-id', 'OTHER')
      .auth(token(owner), { type: 'bearer' })
      .expect(401);
  });
  it.each([
    'page=0',
    'page=1.5',
    'page=10001',
    'perPage=0',
    'perPage=51',
    'page=bad',
  ])('validates bounded pagination %s', async (query) => {
    const id = await user();
    await http(id, `/gamification/xp-history?${query}`).expect(400);
    await http(id, `/gamification/discoveries?${query}`).expect(400);
  });
  it('returns typed, safely projected history/discovery/achievement/challenge contracts', async () => {
    const id = await user();
    await scan(id).expect(201);
    const xp = body<{
      data: { amount: number; kind: string; localDay: string }[];
      total: number;
    }>(await http(id, '/gamification/xp-history?perPage=1').expect(200));
    expect(xp.total).toBe(1);
    expect(xp.data).toHaveLength(1);
    expect(xp.data[0].amount).toBeGreaterThan(0);
    expect(JSON.stringify(xp)).not.toMatch(/password|userId|eventKey/);
    expect(
      body<{ total: number }>(
        await http(id, '/gamification/discoveries').expect(200),
      ).total,
    ).toBe(0);
    const achievements = body<{ unlocked: boolean; rewardXp: number }[]>(
      await http(id, '/gamification/achievements').expect(200),
    );
    expect(achievements).toHaveLength(8);
    expect(achievements.filter((r) => r.unlocked)).toHaveLength(1);
    expect(achievements.every((r) => r.rewardXp === 0)).toBe(true);
    const active = body<{ key: string; period: string; progress: number }[]>(
      await http(id, '/gamification/challenges').expect(200),
    );
    expect(active).toHaveLength(4);
    expect(
      body<{ progress: number }>(
        await http(id, '/gamification/challenges/daily_scan_3').expect(200),
      ).progress,
    ).toBe(1);
    await http(id, '/gamification/challenges/not_a_challenge').expect(404);
  });
  it('rejects invalid idempotency keys before AI processing', async () => {
    const id = await user();
    await scan(id, 'bad').expect(400);
    expect(ai.analyze).not.toHaveBeenCalled();
  });
  it('rolls back scan and all rewards on an XP processing database error', async () => {
    const id = await user();
    const original = gamification.processScan.bind(
      gamification,
    ) as GamificationService['processScan'];
    const spy = jest
      .spyOn(GamificationService.prototype, 'processScan')
      .mockImplementation(async function (
        this: GamificationService,
        tx,
        scanId,
        userId,
      ) {
        await original(tx, scanId, userId);
        throw new Error('Simulated DB failure after reward writes');
      });
    try {
      await scan(id).expect(500);
    } finally {
      spy.mockRestore();
    }
    expect(await prisma.article.count({ where: { createdById: id } })).toBe(0);
    expect(await prisma.xPTransaction.count({ where: { userId: id } })).toBe(0);
    expect(await prisma.wasteDiscovery.count({ where: { userId: id } })).toBe(
      0,
    );
    await scan(id).expect(201);
    await consistent(id);
  });
  it('never rewards old scans; future rediscovery of an existing historical class earns scan XP only', async () => {
    const id = await user();
    const settings = await prisma.gamificationSettings.findUniqueOrThrow({
      where: { key: 'phase3' },
    });
    const old = await persisted(
      id,
      'pet-bottle',
      new Date(settings.activatedAt.getTime() - 60000),
    );
    await processFixture(id, old.id);
    expect(await prisma.xPTransaction.count({ where: { userId: id } })).toBe(0);
    const current = await persisted(id);
    await processFixture(id, current.id);
    expect(
      body<Overview>(await http(id, '/gamification/overview').expect(200)),
    ).toMatchObject({ totalXp: 5, uniqueDiscoveries: 1 });
    expect(
      await prisma.wasteDiscovery.findUnique({
        where: { userId_wasteSlug: { userId: id, wasteSlug: 'pet-bottle' } },
      }),
    ).toMatchObject({ historical: true, firstScanId: old.id });
    expect(
      await prisma.userAchievement.count({
        where: { userId: id, achievementKey: 'first_discovery' },
      }),
    ).toBe(0);
  });
  it('does not let invalid historical scans suppress a genuine first discovery', async () => {
    const id = await user();
    const settings = await prisma.gamificationSettings.findUniqueOrThrow({
      where: { key: 'phase3' },
    });
    await persisted(
      id,
      'pet-bottle',
      new Date(settings.activatedAt.getTime() - 60000),
      'uncertain',
      ['low_model_score'],
    );
    const current = await persisted(id);
    await processFixture(id, current.id);
    expect(
      body<Overview>(await http(id, '/gamification/overview').expect(200))
        .totalXp,
    ).toBe(25);
  });
  it('computes daily/weekly challenges from unique scan events and handles day/week rollover', async () => {
    const id = await user();
    const monday = new Date('2035-10-07T17:01:00Z'); // Monday in Vietnam
    // Actual canonical slugs from the existing dataset, not guessed identities.
    const catalog = await prisma.wasteItem.findMany({
      orderBy: { slug: 'asc' },
      take: 10,
    });
    for (let day = 0; day < 3; day++)
      for (let i = 0; i < 5; i++) {
        const at = new Date(monday.getTime() + day * 86400000 + i * 1000);
        const saved = await persisted(
          id,
          catalog[(day * 5 + i) % catalog.length].slug,
          at,
        );
        await processFixture(id, saved.id);
        await processFixture(id, saved.id);
      }
    expect(
      await prisma.xPTransaction.count({
        where: { userId: id, kind: 'daily_challenge' },
      }),
    ).toBe(6);
    expect(
      await prisma.xPTransaction.count({
        where: { userId: id, kind: 'weekly_challenge' },
      }),
    ).toBe(2);
    expect(
      await prisma.xPTransaction.count({
        where: { userId: id, kind: 'scan', amount: 5 },
      }),
    ).toBe(15);
    const at = new Date(monday.getTime() + 7 * 86400000);
    const saved = await persisted(id, catalog[0].slug, at);
    await processFixture(id, saved.id);
    const newWeek = periodsAt(at).weekly.key;
    const records = await prisma.userChallengeProgress.findMany({
      where: { userId: id, periodKey: newWeek },
    });
    expect(
      records.find((r) => r.challengeKey === 'weekly_days_3'),
    ).toMatchObject({ progress: 1, rewardedAt: null });
    expect(
      records.find((r) => r.challengeKey === 'weekly_daily_5'),
    ).toMatchObject({ progress: 0, rewardedAt: null });
    expect(
      await prisma.userAchievement.count({
        where: {
          userId: id,
          achievementKey: {
            in: ['first_daily', 'first_weekly', 'discover_5', 'discover_10'],
          },
        },
      }),
    ).toBe(4);
    await consistent(id);
  });
  it('unlocks all 18 discoveries and level 5 without duplicated achievement XP', async () => {
    const id = await user();
    const catalog = await prisma.wasteItem.findMany({
      orderBy: { slug: 'asc' },
    });
    const base = new Date('2036-01-07T01:00:00Z');
    for (let i = 0; i < catalog.length; i++) {
      const saved = await persisted(
        id,
        catalog[i].slug,
        new Date(
          base.getTime() + Math.floor(i / 3) * 86400000 + (i % 3) * 1000,
        ),
      );
      await processFixture(id, saved.id);
    }
    for (let i = 0; i < 6; i++) {
      const saved = await persisted(
        id,
        catalog[0].slug,
        new Date(
          base.getTime() + (6 + Math.floor(i / 3)) * 86400000 + (i % 3) * 1000,
        ),
      );
      await processFixture(id, saved.id);
    }
    const metrics = body<Overview>(
      await http(id, '/gamification/overview').expect(200),
    );
    expect(metrics.uniqueDiscoveries).toBe(18);
    expect(
      await prisma.userAchievement.count({
        where: { userId: id, achievementKey: 'discover_18' },
      }),
    ).toBe(1);
    // Additional daily completion rewards can reach level 5 without fabricated client XP.
    for (let day = 8; day < 15; day++)
      for (let i = 0; i < 5; i++) {
        const saved = await persisted(
          id,
          catalog[0].slug,
          new Date(base.getTime() + day * 86400000 + i * 1000),
        );
        await processFixture(id, saved.id);
      }
    expect(
      await prisma.userAchievement.count({
        where: { userId: id, achievementKey: 'level_5' },
      }),
    ).toBe(1);
    expect(
      body<{ stage: string }>(await http(id, '/gamification/plant').expect(200))
        .stage,
    ).toBe('mature_plant');
    expect(
      await prisma.xPTransaction.count({
        where: {
          userId: id,
          kind: {
            notIn: ['scan', 'discovery', 'daily_challenge', 'weekly_challenge'],
          },
        },
      }),
    ).toBe(0);
    await consistent(id);
  });
  it('scopes idempotency keys per user, even when clients reuse the same key', async () => {
    const a = await user(),
      b = await user(),
      key = randomUUID();
    const [first, second] = await Promise.all([scan(a, key), scan(b, key)]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(body<{ article: { id: string } }>(first).article.id).not.toBe(
      body<{ article: { id: string } }>(second).article.id,
    );
    for (const id of [a, b])
      expect(
        body<Overview>(await http(id, '/gamification/overview').expect(200))
          .totalXp,
      ).toBe(5);
  });
  it('does not expose or recreate an unavailable scan when its idempotency key is retried', async () => {
    const id = await user(),
      key = randomUUID();
    const saved = body<{ article: { id: string } }>(
      await scan(id, key).expect(201),
    );
    await prisma.article.update({
      where: { id: saved.article.id },
      data: { deletedAt: new Date() },
    });
    await scan(id, key).expect(409);
    expect(
      await prisma.xPTransaction.count({ where: { userId: id, kind: 'scan' } }),
    ).toBe(1);
    await consistent(id);
  });
  it('enforces local midnight quota rollover independently of UTC calendar day', async () => {
    const id = await user();
    for (let i = 0; i < 6; i++) {
      const saved = await persisted(
        id,
        'pet-bottle',
        new Date(`2037-01-01T16:59:${String(i).padStart(2, '0')}Z`),
      );
      await processFixture(id, saved.id);
    }
    const next = await persisted(
      id,
      'pet-bottle',
      new Date('2037-01-01T17:00:00Z'),
    );
    await processFixture(id, next.id);
    expect(
      await prisma.xPTransaction.count({
        where: { userId: id, kind: 'scan', localDay: '2037-01-01', amount: 5 },
      }),
    ).toBe(5);
    expect(
      await prisma.xPTransaction.count({
        where: { userId: id, kind: 'scan', localDay: '2037-01-02', amount: 5 },
      }),
    ).toBe(1);
    await consistent(id);
  });
  it('rejects library invisibility, deleted scans and mismatched canonical JSON without XP', async () => {
    const id = await user();
    const saved = await persisted(id);
    const hidden = new Error('rollback test-only visibility changes');
    await expect(
      prisma.$transaction(async (tx) => {
        const waste = await tx.wasteItem.findUniqueOrThrow({
          where: { slug: 'pet-bottle' },
        });
        await tx.article.update({
          where: { id: waste.articleId },
          data: { status: 'inactive' },
        });
        await gamification.processScan(tx, saved.id, id);
        expect(await tx.xPTransaction.count({ where: { userId: id } })).toBe(0);
        throw hidden;
      }),
    ).rejects.toBe(hidden);
    await prisma.scanAnalysis.update({
      where: { articleId: saved.id },
      data: {
        result: {
          schemaVersion: 1,
          status: 'matched',
          reasons: [],
          matchedWaste: { slug: 'paper' },
        },
      },
    });
    await processFixture(id, saved.id);
    expect(await prisma.xPTransaction.count({ where: { userId: id } })).toBe(0);
    const deleted = await persisted(id);
    await prisma.article.update({
      where: { id: deleted.id },
      data: { deletedAt: new Date() },
    });
    await processFixture(id, deleted.id);
    expect(await prisma.xPTransaction.count({ where: { userId: id } })).toBe(0);
  });
  it('validates challenge path keys instead of accepting arbitrary input', async () => {
    const id = await user();
    await http(id, '/gamification/challenges/UPPER').expect(400);
    await http(id, `/gamification/challenges/${'a'.repeat(65)}`).expect(400);
  });
  it('migration backfills valid history additively, leaves users/scans/content unchanged and awards no XP', async () => {
    const client = new Client({
      connectionString: process.env.TEST_DATABASE_URL!,
    });
    await client.connect();
    const schema = `phase3_migration_${randomUUID().replace(/-/g, '')}`;
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      const root = join(__dirname, '../prisma/migrations');
      for (const folder of readdirSync(root)
        .filter(
          (name) => /^20/.test(name) && name < '20261009000000_gamification',
        )
        .sort())
        await client.query(
          readFileSync(join(root, folder, 'migration.sql'), 'utf8'),
        );
      const owner = randomUUID(),
        canonical = randomUUID(),
        valid = randomUUID(),
        uncertain = randomUUID();
      await client.query(
        'INSERT INTO users (id,email,"fullName",password,"updatedAt") VALUES ($1,$2,$3,$4,NOW())',
        [owner, `${owner}@example.invalid`, 'Preserved', 'not-a-real-password'],
      );
      for (const id of [canonical, valid, uncertain])
        await client.query(
          'INSERT INTO articles (id,title,content,type,"createdById","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
          [
            id,
            'Preserved',
            'Existing content',
            id === canonical ? 'library' : 'ai_scan',
            id === canonical ? null : owner,
          ],
        );
      await client.query(
        'INSERT INTO waste_items (slug,"articleId","nameEn",aliases,materials,"searchText",guidance,version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        ['pet-bottle', canonical, 'PET', [], ['plastic'], 'pet', {}, 'test'],
      );
      for (const [id, status, reasons] of [
        [valid, 'matched', []],
        [uncertain, 'uncertain', ['low_model_score']],
      ] as [string, string, string[]][])
        await client.query(
          'INSERT INTO scan_analyses ("articleId","wasteSlug",result) VALUES ($1,$2,$3)',
          [
            id,
            'pet-bottle',
            {
              schemaVersion: 1,
              status,
              reasons,
              matchedWaste: { slug: 'pet-bottle' },
            },
          ],
        );
      await client.query(
        readFileSync(
          join(root, '20261009000000_gamification/migration.sql'),
          'utf8',
        ),
      );
      const rows = await client.query<{
        historical: boolean;
        firstScanId: string;
      }>('SELECT * FROM waste_discoveries');
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({
        historical: true,
        firstScanId: valid,
      });
      expect(
        (await client.query('SELECT * FROM xp_transactions')).rowCount,
      ).toBe(0);
      expect(
        (
          await client.query('SELECT * FROM articles WHERE content=$1', [
            'Existing content',
          ])
        ).rowCount,
      ).toBe(3);
      expect(
        (
          await client.query('SELECT * FROM users WHERE "fullName"=$1', [
            'Preserved',
          ])
        ).rowCount,
      ).toBe(1);
      // Schema/fixtures intentionally retained in isolated test DB; no destructive cleanup.
    } finally {
      await client.end();
    }
  });
});
