import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ServiceUnavailableException,
} from '@nestjs/common';
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
import { catalogId } from '../src/waste/data/waste.dataset';
import { seedWaste } from '../src/waste/data/seed-waste';
import { BcryptProvider } from '../src/identities/auth/providers/bcrypt.provider';

function body<T>(res: request.Response): T {
  return JSON.parse(res.text) as T;
}
describe('Phase 2 HTTP / PostgreSQL contracts', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let png: Buffer;
  const owner = randomUUID();
  const other = randomUUID();
  const admin = randomUUID();
  const category = randomUUID();
  const hiddenCategory = randomUUID();
  const posts = [randomUUID(), randomUUID(), randomUUID()];
  const inactive = randomUUID();
  const scan = randomUUID();
  const hiddenPost = randomUUID();
  const keyword = `phase2-${randomUUID()}`;
  const jwt = new JwtService();
  const password = 'Phase2-password-123';
  const delivery = {
    sendOtp: jest
      .fn<Promise<void>, [string, string]>()
      .mockResolvedValue(undefined),
  };
  const media = {
    upload: jest.fn<
      Promise<{ url: string; publicId: string }>,
      [Buffer, string?]
    >(),
    remove: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  };
  function token(id = owner, version = 0) {
    return jwt.sign(
      {
        sub: id,
        tenantId: 'RECYCLELENS',
        tokenVersion: version,
        tokenUse: 'access',
      },
      {
        secret: process.env.JWT_SECRET!,
        audience: 'foundation-test',
        issuer: 'foundation-test',
        expiresIn: 3600,
      },
    );
  }
  function http(
    method: 'get' | 'put' | 'delete' | 'post' | 'patch',
    path: string,
    id = owner,
  ) {
    return request(app.getHttpServer())
      [method](path)
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(token(id), { type: 'bearer' });
  }
  function auth(path: string, payload: object) {
    return request(app.getHttpServer())
      .post(`/auth/${path}`)
      .set('x-tenant-id', 'RECYCLELENS')
      .send(payload);
  }
  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.TEST_DATABASE_URL!,
      }),
    });
    const hash = await new BcryptProvider().hashPassword(password);
    await prisma.user.createMany({
      data: [owner, other, admin].map((id) => ({
        id,
        email: `${id}@example.invalid`,
        fullName: 'Phase2',
        password: hash,
        isVerified: true,
        role: id === admin ? 'admin' : 'user',
      })),
    });
    await prisma.category.createMany({
      data: [
        { id: category, title: keyword, type: 'post' },
        { id: hiddenCategory, title: `${keyword}-hidden`, status: 'inactive' },
      ],
    });
    const date = new Date('2026-10-01T00:00:00Z');
    await prisma.article.createMany({
      data: [
        ...posts.map((id, i) => ({
          id,
          title: `${keyword} ${i}`,
          description: 'Môi trường',
          content: '<p>Preserved article</p>',
          categoryId: category,
          createdAt: date,
        })),
        {
          id: inactive,
          title: keyword,
          content: 'inactive',
          status: 'inactive',
          categoryId: category,
        },
        {
          id: scan,
          title: keyword,
          content: 'private',
          type: 'ai_scan',
          createdById: owner,
          categoryId: category,
        },
        {
          id: hiddenPost,
          title: keyword,
          content: 'hidden category',
          categoryId: hiddenCategory,
        },
      ],
    });
    await seedWaste(prisma);
    png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: 'green' },
    })
      .png()
      .toBuffer();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ResendProvider)
      .useValue(delivery)
      .overrideProvider(ScanMediaService)
      .useValue(media)
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
  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });
  beforeEach(() => {
    media.upload.mockReset().mockResolvedValue({
      url: 'https://images.example.invalid/avatar.jpg',
      publicId: randomUUID(),
    });
    media.remove.mockClear();
  });

  it('filters before pagination and uses a stable ID tie-breaker for equal dates', async () => {
    const query = `/articles?type=post&categoryId=${category}&keyword=${keyword}&perPage=2&sortBy=latest`;
    const first = body<{
      data: { id: string }[];
      total: number;
      totalPages: number;
    }>(await http('get', `${query}&page=1`).expect(200));
    const second = body<{ data: { id: string }[] }>(
      await http('get', `${query}&page=2`).expect(200),
    );
    expect(first.total).toBe(3);
    expect(first.totalPages).toBe(2);
    expect([...first.data, ...second.data].map((x) => x.id)).toEqual(
      [...posts].sort(),
    );
    expect(
      body<{ total: number }>(
        await http('get', `/articles?keyword=no-match-${keyword}`).expect(200),
      ).total,
    ).toBe(0);
  });
  it('searches descriptions and sorts the full filtered set', async () => {
    const result = body<{ data: { id: string }[] }>(
      await http(
        'get',
        `/articles?categoryId=${category}&keyword=${encodeURIComponent('môi trường')}&sortBy=title_desc`,
      ).expect(200),
    );
    expect(result.data.map((x) => x.id)).toEqual([...posts].reverse());
  });
  it.each([
    'page=0',
    'page=1.5',
    'page=1000001',
    'perPage=101',
    'perPage=-1',
    'categoryId=bad',
    'keyword=one&keyword=two',
    'sortBy=bad',
  ])('rejects invalid article/liked query %s', async (query) => {
    await http('get', `/articles?${query}`).expect(400);
    await http('get', `/articles/liked?${query}`).expect(400);
  });
  it.each([inactive, scan, hiddenPost])(
    'rejects hidden detail/favorite %s even if a saved row exists',
    async (id) => {
      await prisma.articleLike.create({
        data: { userId: owner, articleId: id },
      });
      await http('get', `/articles/${id}`).expect(404);
      await http('put', `/articles/${id}/favorite`).expect(404);
      await http('delete', `/articles/${id}/favorite`).expect(404);
      const list = body<{ data: { id: string }[] }>(
        await http('get', '/articles/liked').expect(200),
      );
      expect(list.data.map((x) => x.id)).not.toContain(id);
    },
  );
  it('public category counts never reveal private/inactive article counts; admin retains access', async () => {
    const result = body<{ _count: { articles: number } }>(
      await http('get', `/categories/${category}`).expect(200),
    );
    expect(result._count.articles).toBe(3);
    await http('get', `/categories/${hiddenCategory}`).expect(404);
    await http('get', `/admin/categories/${hiddenCategory}`, admin).expect(200);
    expect(
      body<{ total: number }>(
        await http(
          'get',
          `/categories?status=inactive&keyword=${keyword}`,
        ).expect(200),
      ).total,
    ).toBe(0);
    await http('get', '/categories?perPage=101').expect(400);
    await http('get', '/categories?type=ai_scan').expect(400);
    await http('get', '/articles/not-uuid').expect(400);
  });
  it('favorites are idempotent under concurrent saves and isolated by JWT identity', async () => {
    await Promise.all(
      [0, 1, 2].map(() =>
        http('put', `/articles/${posts[0]}/favorite`).expect(200),
      ),
    );
    expect(
      await prisma.articleLike.count({
        where: { userId: owner, articleId: posts[0] },
      }),
    ).toBe(1);
    expect(
      body<{ total: number }>(
        await http(
          'get',
          `/articles/liked?type=post&categoryId=${category}`,
        ).expect(200),
      ).total,
    ).toBe(1);
    expect(
      body<{ total: number }>(
        await http(
          'get',
          `/articles/liked?type=post&categoryId=${category}`,
          other,
        ).expect(200),
      ).total,
    ).toBe(0);
    await http('delete', `/articles/${posts[0]}/favorite`, other).expect(200);
    expect(
      body<{ isLiked: boolean }>(
        await http('get', `/articles/${posts[0]}`).expect(200),
      ).isLiked,
    ).toBe(true);
    await http('delete', `/articles/${posts[0]}/favorite`).expect(200);
    await http('delete', `/articles/${posts[0]}/favorite`).expect(200);
    expect(
      body<{ isLiked: boolean }>(
        await http('get', `/articles/${posts[0]}`).expect(200),
      ).isLiked,
    ).toBe(false);
  });
  it('concurrent canonical waste saves share the same safe favorite constraint', async () => {
    await Promise.all(
      [0, 1, 2].map(() =>
        http('put', '/waste/pet-bottle/favorite').expect(200),
      ),
    );
    expect(
      await prisma.articleLike.count({
        where: { userId: owner, articleId: catalogId('article', 'pet-bottle') },
      }),
    ).toBe(1);
    await http('delete', '/waste/pet-bottle/favorite').expect(200);
  });

  it('preserves legacy library favorites through the same ArticleLike table', async () => {
    const id = randomUUID();
    await prisma.article.create({
      data: {
        id,
        title: keyword,
        content: '<p>Old knowledge</p>',
        type: 'library',
      },
    });
    await http('put', `/articles/${id}/favorite`).expect(200);
    const saved = body<{ data: { id: string }[] }>(
      await http(
        'get',
        `/articles/liked?type=library&libraryScope=legacy&keyword=${keyword}`,
      ).expect(200),
    );
    expect(saved.data.map((x) => x.id)).toEqual([id]);
    expect(
      (await prisma.article.findUniqueOrThrow({ where: { id } })).content,
    ).toBe('<p>Old knowledge</p>');
  });
  it.each([
    { fullName: '  ' },
    { fullName: null },
    { fullName: 'a'.repeat(101) },
    { age: 0 },
    { age: 121 },
    { age: 1.5 },
  ])('validates profile payload %j', async (payload) => {
    await http('patch', '/users').send(payload).expect(400);
  });
  it('updates only own safe profile fields and persists nullable age', async () => {
    const result = body<{
      id: string;
      fullName: string;
      age: number | null;
      role: string;
    }>(
      await http('patch', '/users')
        .send({
          fullName: '  Tên mới  ',
          age: 30,
          id: other,
          role: 'admin',
          password: 'injected',
          avatar: 'https://untrusted',
        })
        .expect(200),
    );
    expect(result.id).toBe(owner);
    expect(result.fullName).toBe('Tên mới');
    expect(result.age).toBe(30);
    expect(result.role).toBe('user');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('tokenVersion');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: other } })).fullName,
    ).toBe('Phase2');
    await http('patch', '/users').send({ age: null }).expect(200);
    expect(
      body<{ age: null }>(await http('get', '/users/me').expect(200)).age,
    ).toBeNull();
  });
  it('rejects absent/corrupt/oversized avatars before Cloudinary', async () => {
    await http('post', '/users/upload-avatar').expect(422);
    await http('post', '/users/upload-avatar')
      .attach('file', Buffer.from('<svg>bad</svg>'), {
        filename: 'a.jpg',
        contentType: 'image/jpeg',
      })
      .expect(422);
    await http('post', '/users/upload-avatar')
      .attach('file', Buffer.alloc(8 * 1024 * 1024 + 1), {
        filename: 'a.jpg',
        contentType: 'image/jpeg',
      })
      .expect(413);
    expect(media.upload).not.toHaveBeenCalled();
  });
  it('avatar API uses normalized image, random media boundary, safe response and owner persistence', async () => {
    const response = await http('post', '/users/upload-avatar')
      .attach('file', png, {
        filename: 'client-controlled.png',
        contentType: 'image/png',
      })
      .expect(201);
    const user = body<{ id: string; avatar: string }>(response);
    expect(user.id).toBe(owner);
    expect(user.avatar).toBe('https://images.example.invalid/avatar.jpg');
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('tokenVersion');
    expect(media.upload.mock.calls[0][1]).toBe('avatars');
    expect((await sharp(media.upload.mock.calls[0][0]).metadata()).format).toBe(
      'jpeg',
    );
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: other } })).avatar,
    ).toBeNull();
    media.upload.mockRejectedValueOnce(
      new ServiceUnavailableException('Upload unavailable'),
    );
    await http('post', '/users/upload-avatar')
      .attach('file', png, { filename: 'a.png', contentType: 'image/png' })
      .expect(503);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: owner } })).avatar,
    ).toBe(user.avatar);
  });
  it('returns owner history with stable canonical classification; legacy stays nullable', async () => {
    const id = randomUUID();
    const articleId = catalogId('article', 'pet-bottle');
    await prisma.article.create({
      data: {
        id,
        title: 'PET',
        content: '',
        type: 'ai_scan',
        status: 'inactive',
        createdById: owner,
        scanAnalysis: {
          create: {
            wasteSlug: 'pet-bottle',
            result: {
              status: 'matched',
              label: 'PET',
              matchedWaste: { articleId: 'untrusted-provider-id' },
            },
          },
        },
      },
    });
    const history = body<{
      data: {
        id: string;
        createdAt: string;
        classification: { wasteSlug: string; articleId: string } | null;
      }[];
    }>(await http('get', '/vision/my?perPage=50').expect(200));
    expect(history.data.find((x) => x.id === id)?.classification).toMatchObject(
      { wasteSlug: 'pet-bottle', articleId },
    );
    expect(history.data.find((x) => x.id === scan)?.classification).toBeNull();
    expect(history.data.find((x) => x.id === id)?.createdAt).toBeTruthy();
    await http('get', `/vision/my/${id}`, other).expect(404);
    expect(
      body<{ total: number }>(
        await http('get', '/vision/my', other).expect(200),
      ).total,
    ).toBe(0);
  });
  it('rejects passwords beyond bcrypt UTF-8 byte limit rather than silently truncating', async () => {
    const unicodePassword = '🌱'.repeat(20);
    await auth('sign-up', {
      email: `${randomUUID()}@example.invalid`,
      fullName: 'UTF8',
      password: unicodePassword,
    }).expect(400);
    await http('patch', '/users/change-password')
      .send({ oldPassword: password, newPassword: unicodePassword })
      .expect(400);
    await auth('reset-password', {
      userId: owner,
      otpCode: '123456',
      password: unicodePassword,
      confirmPassword: unicodePassword,
    }).expect(400);
  });

  it('register/verify/login/refresh/reset/change-password preserves Foundation controls', async () => {
    const email = `${randomUUID()}@example.invalid`;
    await auth('sign-up', { email, fullName: '  ', password }).expect(400);
    const signup = body<{ userId: string }>(
      await auth('sign-up', {
        email,
        fullName: 'User',
        password,
        role: 'admin',
      }).expect(201),
    );
    expect(signup).not.toHaveProperty('code');
    expect(signup).not.toHaveProperty('password');
    const pending = body<{ requiresVerification: boolean; userId: string }>(
      await auth('sign-in', { email, password }).expect(201),
    );
    expect(pending).toMatchObject({
      requiresVerification: true,
      userId: signup.userId,
    });
    expect(
      delivery.sendOtp.mock.calls.filter(([to]) => to === email),
    ).toHaveLength(1);
    const code = delivery.sendOtp.mock.calls.find(([to]) => to === email)![1];
    await auth('verify-email', { userId: signup.userId, otpCode: code }).expect(
      201,
    );
    await auth('verify-email', { userId: signup.userId, otpCode: code }).expect(
      403,
    );
    const session = body<{ access_token: string; refresh_token: string }>(
      await auth('sign-in', { email, password }).expect(201),
    );
    const claims = jwt.decode<{ tenantId: string; tokenUse: string }>(
      session.access_token,
    );
    expect(claims.tenantId).toBe('RECYCLELENS');
    expect(claims.tokenUse).toBe('access');
    await auth('refresh-token', { refreshToken: session.refresh_token }).expect(
      201,
    );
    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .set('x-tenant-id', 'OTHER')
      .send({ refreshToken: session.refresh_token })
      .expect(401);
    const forgot = body<{ userId: string }>(
      await auth('forgot-password', { email }).expect(201),
    );
    expect(forgot).not.toHaveProperty('code');
    const resetCode = delivery.sendOtp.mock.calls
      .filter(([to]) => to === email)
      .at(-1)![1];
    await auth('reset-password', {
      userId: forgot.userId,
      otpCode: code === resetCode ? '000000' : code,
      password: 'Reset-password-123',
      confirmPassword: 'Reset-password-123',
    }).expect(403);
    await auth('reset-password', {
      userId: forgot.userId,
      otpCode: resetCode,
      password: 'Reset-password-123',
      confirmPassword: 'Reset-password-123',
    }).expect(201);
    await auth('refresh-token', { refreshToken: session.refresh_token }).expect(
      403,
    );
    await request(app.getHttpServer())
      .get('/users/me')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(session.access_token, { type: 'bearer' })
      .expect(401);
    await auth('sign-in', { email, password }).expect(401);
    const renewed = body<{ access_token: string }>(
      await auth('sign-in', { email, password: 'Reset-password-123' }).expect(
        201,
      ),
    );
    await request(app.getHttpServer())
      .patch('/users/change-password')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(renewed.access_token, { type: 'bearer' })
      .send({
        oldPassword: 'Reset-password-123',
        newPassword: 'Changed-password-123',
      })
      .expect(200);
    await request(app.getHttpServer())
      .get('/users/me')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(renewed.access_token, { type: 'bearer' })
      .expect(401);
    await auth('sign-in', { email, password: 'Changed-password-123' }).expect(
      201,
    );
  });
});
