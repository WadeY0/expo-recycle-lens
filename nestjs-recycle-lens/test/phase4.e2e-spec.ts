import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import * as request from 'supertest';
import { App } from 'supertest/types';
import * as sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { ResendProvider } from '../src/common/modules/email/providers/resend.provider';
import { ScanMediaService } from '../src/vision/providers/scan-media.service';
import { ScanImageService } from '../src/vision/providers/scan-image.service';
import {
  VisionAiService,
  AiAnalysis,
} from '../src/vision/providers/vision-ai.service';
import { GamificationService } from '../src/gamification/gamification.service';
import { TenantService } from '../src/common/services/tenant.service';
import { seedWaste } from '../src/waste/data/seed-waste';

function body<T>(res: request.Response): T {
  return JSON.parse(res.text) as T;
}
type Tokens = { access_token: string; refresh_token: string };
type Scan = {
  article: { id: string };
  analysis: { status: string; matchedWaste: { slug: string } };
};
type List = { data: { id?: string; slug?: string }[]; total: number };
const milliseconds = (start: number) =>
  Number((performance.now() - start).toFixed(2));
describe('Phase 4 integrated journeys and bounded local measurements', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let png: Buffer;
  let queries = 0;
  const metrics: Record<string, unknown> = {
    externalProviders: 'MOCKED',
    productionData: false,
  };
  const delivered = new Map<string, string>();
  const ai = { analyze: jest.fn<Promise<AiAnalysis>, unknown[]>() };
  const email = {
    sendOtp: jest.fn((to: string, code: string) => {
      delivered.set(to, code);
      return Promise.resolve({ id: randomUUID() });
    }),
  };
  const media = {
    upload: jest.fn(() =>
      Promise.resolve({
        url: 'https://images.example.invalid/phase4.jpg',
        publicId: randomUUID(),
      }),
    ),
    remove: jest.fn(() => Promise.resolve()),
  };
  async function fixture() {
    const emailAddress = `${randomUUID()}@example.invalid`;
    const password = 'Phase4-test-password';
    const signup = body<{ userId: string }>(
      await request(app.getHttpServer())
        .post('/auth/sign-up')
        .set('x-tenant-id', 'RECYCLELENS')
        .send({ email: emailAddress, password, fullName: 'Phase4 Demo' })
        .expect(201),
    );
    expect(Object.keys(signup).sort()).toEqual(['message', 'userId']);
    const code = delivered.get(emailAddress);
    expect(code).toMatch(/^\d{6}$/);
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .set('x-tenant-id', 'RECYCLELENS')
      .send({ userId: signup.userId, otpCode: code })
      .expect(201);
    const tokens = body<Tokens>(
      await request(app.getHttpServer())
        .post('/auth/sign-in')
        .set('x-tenant-id', 'RECYCLELENS')
        .send({ email: emailAddress, password })
        .expect(201),
    );
    return { id: signup.userId, email: emailAddress, code, ...tokens };
  }
  const get = (token: string, path: string) =>
    request(app.getHttpServer())
      .get(path)
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(token, { type: 'bearer' });
  const save = (token: string, path: string) =>
    request(app.getHttpServer())
      .put(path)
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(token, { type: 'bearer' });
  const unsave = (token: string, path: string) =>
    request(app.getHttpServer())
      .delete(path)
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(token, { type: 'bearer' });
  const scan = (token: string, key: string) =>
    request(app.getHttpServer())
      .post('/vision/analyze-waste')
      .set('x-tenant-id', 'RECYCLELENS')
      .set('Idempotency-Key', key)
      .auth(token, { type: 'bearer' })
      .attach('image', png, {
        filename: 'phase4.png',
        contentType: 'image/png',
      });
  beforeAll(async () => {
    const measured = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.TEST_DATABASE_URL!,
      }),
      log: [{ emit: 'event', level: 'query' }],
    });
    measured.$on('query', () => {
      queries++;
    });
    prisma = measured;
    await seedWaste(prisma);
    png = await sharp({
      create: { width: 640, height: 480, channels: 3, background: 'green' },
    })
      .png()
      .toBuffer();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ResendProvider)
      .useValue(email)
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
    media.upload.mockClear();
    media.remove.mockClear();
  });
  afterAll(async () => {
    if (process.env.PHASE4_MEASUREMENTS_FILE)
      writeFileSync(
        process.env.PHASE4_MEASUREMENTS_FILE,
        JSON.stringify(metrics, null, 2) + '\n',
      );
    await app?.close();
    await prisma?.$disconnect();
  });
  it('verifies signup, one-time email verification, login, profile and refresh as one journey', async () => {
    const owner = await fixture();
    const profile = body<Record<string, unknown>>(
      await get(owner.access_token, '/users/me').expect(200),
    );
    expect(profile).toMatchObject({
      id: owner.id,
      email: owner.email,
      isVerified: true,
    });
    for (const key of ['password', 'tokenVersion', 'otps'])
      expect(profile).not.toHaveProperty(key);
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .set('x-tenant-id', 'RECYCLELENS')
      .send({ userId: owner.id, otpCode: owner.code })
      .expect(403);
    const renewed = body<Tokens>(
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('x-tenant-id', 'RECYCLELENS')
        .send({ refreshToken: owner.refresh_token })
        .expect(201),
    );
    expect(
      body<{ id: string }>(
        await get(renewed.access_token, '/users/me').expect(200),
      ).id,
    ).toBe(owner.id);
    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .set('x-tenant-id', 'OTHER')
      .send({ refreshToken: owner.refresh_token })
      .expect(401);
  });
  it('connects owned scan, canonical guidance, history, favorites, articles and XP without cross-account access', async () => {
    const owner = await fixture();
    const result = body<Scan>(
      await scan(owner.access_token, randomUUID()).expect(201),
    );
    expect(result.analysis).toMatchObject({
      status: 'matched',
      matchedWaste: { slug: 'pet-bottle' },
    });
    expect(
      body<Record<string, unknown>>(
        await get(owner.access_token, '/waste/pet-bottle').expect(200),
      ),
    ).toHaveProperty('guidance');
    expect(
      body<List>(await get(owner.access_token, '/vision/my').expect(200)).data,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: result.article.id }),
      ]),
    );
    const library = body<List>(
      await get(
        owner.access_token,
        '/waste?keyword=chai&material=plastic',
      ).expect(200),
    );
    expect(library.data.some((item) => item.slug === 'pet-bottle')).toBe(true);
    await save(owner.access_token, '/waste/pet-bottle/favorite').expect(200);
    expect(
      body<List>(await get(owner.access_token, '/waste/favorites').expect(200))
        .data,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: 'pet-bottle' })]),
    );
    const category = await prisma.category.create({
      data: { title: 'Phase4 learning', type: 'post' },
    });
    const article = await prisma.article.create({
      data: {
        title: 'Phase4 learning',
        content: '<p>Verified fixture</p>',
        type: 'post',
        categoryId: category.id,
        createdById: owner.id,
      },
    });
    await get(owner.access_token, `/articles/${article.id}`).expect(200);
    await save(owner.access_token, `/articles/${article.id}/favorite`).expect(
      200,
    );
    expect(
      body<List>(
        await get(owner.access_token, '/articles/liked?type=post').expect(200),
      ).data,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: article.id })]),
    );
    await unsave(owner.access_token, `/articles/${article.id}/favorite`).expect(
      200,
    );
    expect(
      body<List>(
        await get(owner.access_token, '/articles/liked?type=post').expect(200),
      ).data,
    ).toHaveLength(0);
    expect(
      body<Record<string, unknown>>(
        await get(owner.access_token, '/gamification/overview').expect(200),
      ),
    ).toMatchObject({ totalXp: 25, eligibleScans: 1, uniqueDiscoveries: 1 });
    await get(owner.access_token, '/gamification/plant').expect(200);
    const other = await fixture();
    await get(other.access_token, `/vision/my/${result.article.id}`).expect(
      404,
    );
    await get(owner.access_token, `/articles/${result.article.id}`).expect(404);
    expect(
      body<List>(await get(other.access_token, '/vision/my').expect(200)).data,
    ).toHaveLength(0);
    expect(
      body<List>(await get(other.access_token, '/waste/favorites').expect(200))
        .data,
    ).toHaveLength(0);
    expect(
      body<Record<string, unknown>>(
        await get(other.access_token, '/gamification/overview').expect(200),
      ),
    ).toMatchObject({ totalXp: 0 });
    await unsave(owner.access_token, '/waste/pet-bottle/favorite').expect(200);
  });
  it('bounds ten concurrent same-key scans to one saved scan and one XP event without a canonical discovery', async () => {
    const owner = await fixture();
    const key = randomUUID();
    const start = performance.now();
    const before = process.memoryUsage();
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => scan(owner.access_token, key)),
    );
    metrics.concurrentScan = {
      requests: 10,
      milliseconds: milliseconds(start),
      mockedAiCalls: ai.analyze.mock.calls.length,
      mediaCleanupCalls: media.remove.mock.calls.length,
      memoryBefore: before,
      memoryAfter: process.memoryUsage(),
    };
    responses.forEach((res) => expect(res.status).toBe(201));
    expect(
      new Set(responses.map((res) => body<Scan>(res).article.id)).size,
    ).toBe(1);
    expect(
      await prisma.article.count({
        where: { createdById: owner.id, type: 'ai_scan' },
      }),
    ).toBe(1);
    expect(
      await prisma.xPTransaction.count({ where: { userId: owner.id } }),
    ).toBe(1);
    expect(
      await prisma.xPTransaction.aggregate({
        where: { userId: owner.id },
        _sum: { amount: true },
      }),
    ).toMatchObject({ _sum: { amount: 5 } });
    expect(
      await prisma.userGamificationProfile.findUnique({
        where: { userId: owner.id },
      }),
    ).toMatchObject({ totalXp: 5, eligibleScans: 1 });
    const replay = body<Scan>(await scan(owner.access_token, key).expect(201));
    expect(replay.article.id).toBe(body<Scan>(responses[0]).article.id);
    expect(
      await prisma.xPTransaction.count({ where: { userId: owner.id } }),
    ).toBe(1);
  });
  it('measures thirty local dashboard reads with bounded query counts, without speed thresholds', async () => {
    const owner = await fixture();
    await scan(owner.access_token, randomUUID()).expect(201);
    const service = new GamificationService({
      getPrismaClient: () => Promise.resolve(prisma),
    } as TenantService);
    const times: number[] = [];
    const counts: number[] = [];
    for (let index = 0; index < 30; index++) {
      const before = queries;
      const start = performance.now();
      expect(await service.overview(owner.id)).toMatchObject({ totalXp: 25 });
      times.push(milliseconds(start));
      counts.push(queries - before);
    }
    const sorted = [...times].sort((a, b) => a - b);
    metrics.dashboard = {
      samples: 30,
      p50Ms: sorted[14],
      p95Ms: sorted[28],
      maxMs: sorted[29],
      queryCounts: [...new Set(counts)],
      includesTransactionStatements: true,
      fixtureEligibleScans: 1,
    };
    expect(new Set(counts).size).toBe(1);
    expect(Math.max(...counts)).toBeLessThanOrEqual(16);
    const plans = await prisma.$queryRaw<
      {
        'QUERY PLAN': {
          Plan: Record<string, unknown>;
          'Execution Time': number;
        }[];
      }[]
    >`EXPLAIN (ANALYZE, FORMAT JSON) SELECT id, amount FROM xp_transactions WHERE "userId" = ${owner.id}::uuid ORDER BY "occurredAt" DESC, id DESC LIMIT 20`;
    metrics.ledgerExplain = plans[0]['QUERY PLAN'][0];

    expect(
      await prisma.xPTransaction.count({ where: { userId: owner.id } }),
    ).toBe(2);
  });
  it('measures three synthetic image normalizations and verifies JPEG output without calling AI', async () => {
    const imageService = new ScanImageService();
    const times: number[] = [];
    let outputBytes = 0;
    for (let index = 0; index < 3; index++) {
      const start = performance.now();
      const normalized = await imageService.normalize({
        buffer: png,
        mimetype: 'image/png',
      } as Express.Multer.File);
      times.push(milliseconds(start));
      outputBytes = normalized.length;
      expect((await sharp(normalized).metadata()).format).toBe('jpeg');
    }
    metrics.imageNormalization = {
      samples: 3,
      width: 640,
      height: 480,
      inputBytes: png.length,
      outputBytes,
      milliseconds: times,
      synthetic: true,
    };
    expect(ai.analyze).not.toHaveBeenCalled();
  });
});
