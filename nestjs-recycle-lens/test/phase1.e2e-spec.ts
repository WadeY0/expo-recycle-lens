import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadGatewayException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { App } from 'supertest/types';
import * as sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { seedWaste } from '../src/waste/data/seed-waste';
import { catalogId, WASTE_DATASET } from '../src/waste/data/waste.dataset';
import { ScanMediaService } from '../src/vision/providers/scan-media.service';
import { VisionAiService } from '../src/vision/providers/vision-ai.service';
import { toJson } from '../src/waste/json';
import { NormalizedScan } from '../src/waste/waste.types';
function body<T>(response: request.Response): T {
  const value: unknown = JSON.parse(response.text);
  return value as T;
}
describe('Phase 1 real HTTP and PostgreSQL', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let png: Buffer;
  const jwt = new JwtService();
  const owner = randomUUID();
  const other = randomUUID();
  const media = {
    upload: jest.fn<Promise<{ url: string; publicId: string }>, [Buffer]>(),
    remove: jest.fn<Promise<void>, [string]>(),
  };
  const ai = {
    analyze: jest.fn<
      Promise<{
        result: unknown;
        conversationId: string | null;
        provider: string;
        model: string;
      }>,
      [string, string, string?]
    >(),
  };
  const petId = catalogId('article', 'pet-bottle');
  function token(userId = owner, tenantId = 'RECYCLELENS') {
    return jwt.sign(
      { sub: userId, tenantId, tokenVersion: 0, tokenUse: 'access' },
      {
        secret: process.env.JWT_SECRET!,
        audience: 'foundation-test',
        issuer: 'foundation-test',
        expiresIn: 3600,
      },
    );
  }
  function get(path: string, user = owner) {
    return request(app.getHttpServer())
      .get(path)
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(token(user), { type: 'bearer' });
  }
  function scan(user = owner) {
    return request(app.getHttpServer())
      .post('/vision/analyze-waste')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(token(user), { type: 'bearer' });
  }
  async function scanResult(result: unknown, user = owner) {
    ai.analyze.mockResolvedValueOnce({
      result:
        result && typeof result === 'object'
          ? {
              content: '<p>Provider fixture analysis.</p>',
              title:
                (result as Record<string, unknown>).label ??
                (result as Record<string, unknown>).wasteClass,
              ...result,
            }
          : result,
      conversationId: null,
      provider: 'fixture',
      model: 'test-model',
    });
    const response = await scan(user)
      .attach('image', png, { filename: 'scan.png', contentType: 'image/png' })
      .expect(201);
    return body<{ article: { id: string }; analysis: NormalizedScan }>(
      response,
    );
  }
  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.TEST_DATABASE_URL!,
      }),
    });
    await prisma.user.createMany({
      data: [owner, other].map((id) => ({
        id,
        email: `${id}@example.invalid`,
        fullName: 'Phase 1 test',
        password: '',
        isVerified: true,
      })),
    });
    const legacyId = randomUUID();
    await prisma.article.create({
      data: {
        id: legacyId,
        title: 'Legacy library preserved',
        content: 'existing content',
        type: 'library',
      },
    });
    await seedWaste(prisma);
    await seedWaste(prisma);
    expect(
      (await prisma.article.findUniqueOrThrow({ where: { id: legacyId } }))
        .content,
    ).toBe('existing content');
    expect(
      await prisma.wasteItem.count({
        where: { slug: { in: WASTE_DATASET.map((item) => item.slug) } },
      }),
    ).toBe(18);
    png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: 'green' },
    })
      .png()
      .toBuffer();
    const module = await Test.createTestingModule({ imports: [AppModule] })
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
    media.upload.mockReset().mockResolvedValue({
      url: 'https://images.example.invalid/phase1.jpg',
      publicId: 'fixture-upload',
    });
    media.remove.mockReset().mockResolvedValue(undefined);
    ai.analyze.mockReset();
  });
  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });
  it('rejects anonymous library and scanner access', async () => {
    await request(app.getHttpServer())
      .get('/waste')
      .set('x-tenant-id', 'RECYCLELENS')
      .expect(401);
    await request(app.getHttpServer())
      .post('/vision/analyze-waste')
      .set('x-tenant-id', 'RECYCLELENS')
      .expect(401);
  });
  it('lists backend-owned catalog, categories and materials', async () => {
    const response = await get('/waste?perPage=50').expect(200);
    expect(body<{ total: number }>(response).total).toBe(18);
    const filters = body<{ categories: unknown[]; materials: unknown[] }>(
      await get('/waste/filters').expect(200),
    );
    expect(filters.categories).toHaveLength(7);
    expect(filters.materials).toHaveLength(9);
  });
  it.each(['chai nhựa PET', 'chai nhua pet', 'PET bottle'])(
    'searches Unicode/alias %s server-side',
    async (keyword) => {
      const result = body<{ data: { slug: string }[] }>(
        await get(`/waste?keyword=${encodeURIComponent(keyword)}`).expect(200),
      );
      expect(result.data.map((x) => x.slug)).toContain('pet-bottle');
    },
  );
  it('combines category and material filters on all rows before pagination', async () => {
    const category = catalogId('category', 'paper');
    const result = body<{ data: { slug: string }[] }>(
      await get(`/waste?categoryId=${category}&material=plastic`).expect(200),
    );
    expect(result.data.map((x) => x.slug)).toEqual(['beverage-carton']);
  });
  it('paginates without duplicate rows', async () => {
    const a = body<{ data: { slug: string }[]; totalPages: number }>(
      await get('/waste?perPage=5&page=1').expect(200),
    );
    const b = body<{ data: { slug: string }[] }>(
      await get('/waste?perPage=5&page=2').expect(200),
    );
    expect(a.totalPages).toBe(4);
    expect(new Set([...a.data, ...b.data].map((x) => x.slug)).size).toBe(10);
  });
  it.each([
    'page=0',
    'page=1.5',
    'perPage=9999',
    'material=made-up',
    'categoryId=not-uuid',
  ])('validates query %s', async (query) => {
    await get(`/waste?${query}`).expect(400);
  });
  it('looks up both stable slug and existing Article ID with provenance', async () => {
    for (const id of ['pet-bottle', petId]) {
      const result = body<{
        articleId: string;
        guidance: { provenance: unknown[] };
      }>(await get(`/waste/${id}`).expect(200));
      expect(result.articleId).toBe(petId);
      expect(result.guidance.provenance.length).toBeGreaterThan(0);
    }
    const legacyContract = body<{ wasteItem: { slug: string } }>(
      await get(`/articles/${petId}`).expect(200),
    );
    expect(legacyContract.wasteItem.slug).toBe('pet-bottle');
  });
  it('keeps legacy environmental articles and saved items accessible without mixing canonical items', async () => {
    const id = randomUUID();
    await prisma.article.create({
      data: {
        id,
        title: 'Legacy environmental education',
        content: 'preserved',
        type: 'library',
        likes: { create: { userId: owner } },
      },
    });
    const list = body<{ data: { id: string }[] }>(
      await get(
        '/articles?type=library&libraryScope=legacy&perPage=100',
      ).expect(200),
    );
    expect(list.data.map((row) => row.id)).toContain(id);
    expect(list.data.map((row) => row.id)).not.toContain(petId);
    const saved = body<{ data: { id: string }[] }>(
      await get('/articles/liked?type=library&libraryScope=legacy').expect(200),
    );
    expect(saved.data.map((row) => row.id)).toContain(id);
    expect(
      body<{ data: { id: string }[] }>(
        await get(
          '/articles/liked?type=library&libraryScope=legacy',
          other,
        ).expect(200),
      ).data.map((row) => row.id),
    ).not.toContain(id);
  });
  it('returns 404 for unknown lookup', async () => {
    await get('/waste/no-such-item').expect(404);
    await get(`/waste/${'a'.repeat(36)}`).expect(404);
  });
  it('persists idempotent favorites and isolates users', async () => {
    for (let i = 0; i < 2; i++)
      await request(app.getHttpServer())
        .put(`/waste/${petId}/favorite`)
        .set('x-tenant-id', 'RECYCLELENS')
        .auth(token(), { type: 'bearer' })
        .expect(200);
    expect(
      await prisma.articleLike.count({
        where: { userId: owner, articleId: petId },
      }),
    ).toBe(1);
    const saved = body<{ data: { slug: string }[] }>(
      await get('/waste/favorites?material=plastic').expect(200),
    );
    expect(saved.data.map((x) => x.slug)).toContain('pet-bottle');
    expect(
      body<{ total: number }>(await get('/waste/favorites', other).expect(200))
        .total,
    ).toBe(0);
    for (let i = 0; i < 2; i++)
      await request(app.getHttpServer())
        .delete(`/waste/${petId}/favorite`)
        .set('x-tenant-id', 'RECYCLELENS')
        .auth(token(), { type: 'bearer' })
        .expect(200);
    expect(
      body<{ isFavorite: boolean }>(await get(`/waste/${petId}`).expect(200))
        .isFavorite,
    ).toBe(false);
  });
  it('hides inactive canonical records even when queried directly', async () => {
    const id = randomUUID();
    const slug = `inactive-${id}`;
    await prisma.article.create({
      data: {
        id,
        title: 'Hidden canonical',
        type: 'library',
        status: 'inactive',
        content: 'hidden',
        categoryId: catalogId('category', 'plastics'),
        wasteItem: {
          create: {
            slug,
            nameEn: 'hidden',
            aliases: [],
            materials: ['plastic'],
            searchText: slug,
            guidance: toJson(WASTE_DATASET[0].guidance),
            version: 'test',
          },
        },
      },
    });
    await get(`/waste/${id}`).expect(404);
    expect(
      body<{ total: number }>(await get(`/waste?keyword=${slug}`).expect(200))
        .total,
    ).toBe(0);
  });
  it('validates bytes and missing upload before any media/AI call', async () => {
    await scan().expect(422);
    await scan()
      .attach('image', Buffer.from('<script>fake image</script>'), {
        filename: 'bad.jpg',
        contentType: 'image/jpeg',
      })
      .expect(422);
    expect(media.upload).not.toHaveBeenCalled();
    expect(ai.analyze).not.toHaveBeenCalled();
  });
  it('rejects oversized multipart uploads', async () => {
    await scan()
      .attach('image', Buffer.alloc(8 * 1024 * 1024 + 1), {
        filename: 'big.jpg',
        contentType: 'image/jpeg',
      })
      .expect(413);
    expect(media.upload).not.toHaveBeenCalled();
  });
  it('persists provider HTML independently of library; only owner can read history/detail', async () => {
    const result = await scanResult(
      JSON.stringify({
        wasteClass: 'pet-bottle',
        title: 'PET bottle',
        content: '<b>Provider analysis</b>',
      }),
    );
    expect(result.analysis.matchedWaste).toBeNull();
    expect(result.analysis.label).toBe('PET bottle');
    expect(result.analysis.content).toBe('<b>Provider analysis</b>');
    const row = await prisma.article.findUniqueOrThrow({
      where: { id: result.article.id },
      include: { scanAnalysis: true },
    });
    expect(row.createdById).toBe(owner);
    expect(row.status).toBe('inactive');
    expect(row.scanAnalysis?.wasteSlug).toBeNull();
    expect(row.content).toBe('<b>Provider analysis</b>');
    const detail = body<{
      id: string;
      analysis: NormalizedScan;
      scanAnalysis: { result: NormalizedScan };
    }>(await get(`/vision/my/${row.id}`).expect(200));
    expect(detail.scanAnalysis.result).toEqual(result.analysis);
    expect(detail.analysis).toEqual(result.analysis);
    expect(detail.id).toBe(result.article.id);
    await get(`/vision/my/${row.id}`, other).expect(404);
    await get(`/articles/${row.id}`).expect(404);
    const history = body<{ data: { id: string }[] }>(
      await get('/vision/my').expect(200),
    );
    expect(history.data.map((x) => x.id)).toContain(row.id);
    expect(
      body<{ data: { id: string }[] }>(
        await get('/vision/my', other).expect(200),
      ).data.map((x) => x.id),
    ).not.toContain(row.id);
  });
  it.each([
    { label: 'PET bottle', confidence: 0.1 },
    { label: 'Unknown object' },
    { label: 'battery', uncertain: true },
  ])('stores unknown/uncertain/hazard safely %j', async (prediction) => {
    const result = await scanResult(prediction);
    expect(result.analysis.guidance).toBeNull();
    expect(result.analysis.matchedWaste).toBeNull();
    expect(result.analysis.status).not.toBe('matched');
    expect(
      await prisma.scanAnalysis.findUnique({
        where: { articleId: result.article.id },
      }),
    ).not.toBeNull();
  });
  it('does not expose ordinary cleaning guidance anywhere in a hazardous bottle result', async () => {
    const result = await scanResult({
      wasteClass: 'pet-bottle',
      hazardous: true,
    });
    expect(result.analysis.status).toBe('hazardous');
    expect(result.analysis.guidance).toBeNull();
    expect(result.analysis.matchedWaste).toBeNull();
    expect(result.analysis.candidates).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('tráng nhẹ');
  });
  it('preserves hazardous AI analysis without canonical library guidance', async () => {
    const result = await scanResult({ wasteClass: 'batteries', label: 'Pin' });
    expect(result.analysis.status).toBe('hazardous');
    expect(result.analysis.guidance).toBeNull();
    expect(result.analysis.content).toBe('<p>Provider fixture analysis.</p>');
  });
  it('rejects malformed analysis, creates no success history and compensates upload', async () => {
    const before = await prisma.article.count({
      where: { createdById: owner, type: 'ai_scan' },
    });
    ai.analyze.mockResolvedValueOnce({
      result: 'not-json',
      conversationId: null,
      provider: 'fixture',
      model: 'fixture',
    });
    await scan()
      .attach('image', png, { filename: 'a.png', contentType: 'image/png' })
      .expect(422);
    expect(
      await prisma.article.count({
        where: { createdById: owner, type: 'ai_scan' },
      }),
    ).toBe(before);
    expect(media.remove).toHaveBeenCalledWith('fixture-upload');
  });
  it('returns provider failure without writing success and cleans upload', async () => {
    ai.analyze.mockRejectedValueOnce(
      new BadGatewayException('AI temporarily unavailable'),
    );
    await scan()
      .attach('image', png, { filename: 'a.png', contentType: 'image/png' })
      .expect(502);
    expect(media.remove).toHaveBeenCalledWith('fixture-upload');
  });
  it('does not reuse or replace another users conversation', async () => {
    const remoteContext = randomUUID();
    await prisma.conversation.create({
      data: { userId: other, type: 'vision', conversationId: remoteContext },
    });
    ai.analyze.mockResolvedValueOnce({
      result: {
        title: 'Chai PET',
        content: '<p>Provider fixture analysis.</p>',
      },
      conversationId: remoteContext,
      provider: 'fixture',
      model: 'fixture',
    });
    await scan()
      .attach('image', png, { filename: 'a.png', contentType: 'image/png' })
      .expect(201);
    expect(ai.analyze.mock.calls.at(-1)?.[2]).not.toBe(remoteContext);
    expect(
      (
        await prisma.conversation.findUniqueOrThrow({
          where: { conversationId: remoteContext },
        })
      ).userId,
    ).toBe(other);
  });
  it('rejects cross-tenant library and scan even if databases share binding', async () => {
    await request(app.getHttpServer())
      .get('/waste')
      .set('x-tenant-id', 'OTHER')
      .auth(token(), { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/vision/analyze-waste')
      .set('x-tenant-id', 'OTHER')
      .auth(token(), { type: 'bearer' })
      .expect(401);
    expect(ai.analyze).not.toHaveBeenCalled();
  });
});
