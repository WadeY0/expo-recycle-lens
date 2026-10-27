import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  PrismaClient,
  ArticleType,
  ContentStatus,
  OtpPurpose,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ResendProvider } from '../src/common/modules/email/providers/resend.provider';
import { UsersService } from '../src/identities/users/providers/users.service';
import { TenantService } from '../src/common/services/tenant.service';
import { BcryptProvider } from '../src/identities/auth/providers/bcrypt.provider';

// Full HTTP pipeline and real SQL; all fixtures stay in an isolated test database.
function responseBody<T>(response: request.Response): T {
  const body: unknown = JSON.parse(response.text);
  return body as T;
}

describe('Foundation HTTP security', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  const jwt = new JwtService();
  const userId = randomUUID();
  const adminId = randomUUID();
  const otherId = randomUUID();
  const publicId = randomUUID();
  const inactiveId = randomUUID();
  const scanId = randomUUID();
  const activeScanId = randomUUID();
  const delivery = {
    sendOtp: jest
      .fn<Promise<void>, [string, string]>()
      .mockResolvedValue(undefined),
  };
  const password = 'Test-password-123';
  function token(
    id: string,
    extras: object = {},
    secret = process.env.JWT_SECRET!,
  ) {
    return jwt.sign(
      {
        sub: id,
        tenantId: 'RECYCLELENS',
        tokenVersion: 0,
        tokenUse: 'access',
        ...extras,
      },
      {
        secret,
        audience: 'foundation-test',
        issuer: 'foundation-test',
        expiresIn: 3600,
      },
    );
  }
  function get(path: string, id = userId, tenant = 'RECYCLELENS') {
    return request(app.getHttpServer())
      .get(path)
      .set('x-tenant-id', tenant)
      .auth(token(id), { type: 'bearer' });
  }
  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.TEST_DATABASE_URL!,
      }),
    });
    const hashing = new BcryptProvider();
    await prisma.user.createMany({
      data: [
        {
          id: userId,
          email: `${userId}@example.invalid`,
          fullName: 'User',
          role: 'user',
          isVerified: true,
          password: await hashing.hashPassword(password),
        },
        {
          id: adminId,
          email: `${adminId}@example.invalid`,
          fullName: 'Admin',
          role: 'admin',
          isVerified: true,
          password: '',
        },
        {
          id: otherId,
          email: `${otherId}@example.invalid`,
          fullName: 'Other',
          role: 'user',
          isVerified: true,
          password: '',
        },
      ],
    });
    await prisma.article.createMany({
      data: [
        {
          id: publicId,
          title: 'Public',
          content: 'public',
          type: ArticleType.post,
        },
        {
          id: inactiveId,
          title: 'Inactive',
          content: 'inactive',
          status: ContentStatus.inactive,
        },
        {
          id: scanId,
          title: 'Private',
          content: 'private',
          type: ArticleType.ai_scan,
          status: ContentStatus.inactive,
          createdById: userId,
        },
        {
          id: activeScanId,
          title: 'Active scan is still private',
          content: 'private',
          type: ArticleType.ai_scan,
          createdById: userId,
        },
      ],
    });
    await prisma.articleLike.createMany({
      data: [
        { userId, articleId: scanId },
        { userId, articleId: inactiveId },
        { userId, articleId: publicId },
      ],
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ResendProvider)
      .useValue(delivery)
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
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  it('serves the existing application root', async () => {
    await request(app.getHttpServer())
      .get('/')
      .set('x-tenant-id', 'RECYCLELENS')
      .expect(200)
      .expect('Hello World!');
  });
  it('rejects anonymous admin access', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('x-tenant-id', 'RECYCLELENS')
      .expect(401);
  });
  it.each(['/admin/users', '/admin/articles', '/admin/categories'])(
    'denies ordinary users at %s',
    async (path) => {
      await get(path).expect(403);
    },
  );
  it.each(['/admin/users', '/admin/articles', '/admin/categories'])(
    'permits administrators at %s',
    async (path) => {
      await get(path, adminId).expect(200);
    },
  );
  it('reads current role from SQL instead of trusting forged/stale JWT role', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(token(userId, { role: 'admin' }), { type: 'bearer' })
      .expect(403);
  });
  it('rejects switching to an unsupported tenant', async () => {
    await get('/users/me', userId, 'OTHER').expect(401);
  });
  it('requires a legacy session without tenant to log in again', async () => {
    const legacy = jwt.sign(
      { sub: userId },
      {
        secret: process.env.JWT_SECRET!,
        issuer: 'foundation-test',
        audience: 'foundation-test',
      },
    );
    await request(app.getHttpServer())
      .get('/users/me')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(legacy, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/users/me')
      .set('x-tenant-id', 'OTHER')
      .auth(legacy, { type: 'bearer' })
      .expect(401);
  });
  it('rejects expired sessions', async () => {
    const expired = jwt.sign(
      {
        sub: userId,
        tenantId: 'RECYCLELENS',
        tokenVersion: 0,
        tokenUse: 'access',
      },
      {
        secret: process.env.JWT_SECRET!,
        issuer: 'foundation-test',
        audience: 'foundation-test',
        expiresIn: -1,
      },
    );
    await request(app.getHttpServer())
      .get('/users/me')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(expired, { type: 'bearer' })
      .expect(401);
  });
  it('rejects invalid audience', async () => {
    const invalid = jwt.sign(
      { sub: userId, tenantId: 'RECYCLELENS' },
      {
        secret: process.env.JWT_SECRET!,
        issuer: 'foundation-test',
        audience: 'other',
      },
    );
    await request(app.getHttpServer())
      .get('/users/me')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(invalid, { type: 'bearer' })
      .expect(401);
  });
  it('rejects invalid issuer', async () => {
    const invalid = jwt.sign(
      { sub: userId, tenantId: 'RECYCLELENS' },
      {
        secret: process.env.JWT_SECRET!,
        issuer: 'other',
        audience: 'foundation-test',
      },
    );
    await request(app.getHttpServer())
      .get('/users/me')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(invalid, { type: 'bearer' })
      .expect(401);
  });
  it('rejects ambiguous legacy tokens by default', async () => {
    const legacy = jwt.sign(
      { sub: userId },
      {
        secret: process.env.JWT_SECRET!,
        issuer: 'foundation-test',
        audience: 'foundation-test',
      },
    );
    await request(app.getHttpServer())
      .get('/users/me')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(legacy, { type: 'bearer' })
      .expect(401);
  });
  it.each([scanId, activeScanId, inactiveId])(
    'blocks private/inactive generic article detail %s',
    async (id) => {
      await get(`/articles/${id}`).expect(404);
    },
  );
  it('generic article lists never leak scans or inactive posts', async () => {
    const response = await get('/articles?type=ai_scan&status=inactive').expect(
      200,
    );
    expect(responseBody<{ data: unknown[] }>(response).data).toHaveLength(0);
  });
  it('liked lists exclude private/inactive records', async () => {
    const response = await get('/articles/liked').expect(200);
    expect(
      responseBody<{ data: { id: string }[] }>(response).data.map((x) => x.id),
    ).toEqual([publicId]);
  });
  it("denies liking someone else's scan through generic routes", async () => {
    await request(app.getHttpServer())
      .post(`/articles/${scanId}/like`)
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(token(otherId), { type: 'bearer' })
      .expect(404);
  });
  it('allows owner scan detail but denies a different owner', async () => {
    await get(`/vision/my/${scanId}`).expect(200);
    await get(`/vision/my/${scanId}`, otherId).expect(404);
  });
  it("owner history has only that owner's scans", async () => {
    const response = await get('/vision/my', otherId).expect(200);
    expect(responseBody<{ data: unknown[] }>(response).data).toHaveLength(0);
  });
  it('me/profile exclude password and tokenVersion; absolute avatars remain intact', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: 'https://google.example/avatar' },
    });
    const response = await get('/users/me').expect(200);
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('tokenVersion');
    expect(responseBody<{ avatar: string }>(response).avatar).toBe(
      'https://google.example/avatar',
    );
    const profile = await request(app.getHttpServer())
      .patch('/users')
      .set('x-tenant-id', 'RECYCLELENS')
      .auth(token(userId), { type: 'bearer' })
      .send({ fullName: 'Updated', role: 'admin' })
      .expect(200);
    expect((profile.body as { role: string }).role).toBe('user');
    expect(profile.body).not.toHaveProperty('password');
  });
  it('avatar service uses safe projection without invoking external Cloudinary', async () => {
    const tenant = {
      getPrismaClient: () => Promise.resolve(prisma),
    } as TenantService;
    const users = new UsersService(tenant, new BcryptProvider());
    const result = await users.uploadAvatar(userId, {
      path: 'https://images.example/avatar',
    } as Express.Multer.File);
    expect(result.avatar).toBe('https://images.example/avatar');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('tokenVersion');
  });
  it.each(['/verification/send-otp', '/verification/verify-otp'])(
    'retires the unsafe legacy route %s without leaking a code',
    async (path) => {
      const response = await request(app.getHttpServer())
        .post(path)
        .set('x-tenant-id', 'RECYCLELENS')
        .send({ userId })
        .expect(410);
      expect(response.body).not.toHaveProperty('code');
    },
  );
  it.each(['refreshToken', 'refresh_token'])(
    'supports canonical/legacy refresh field %s and issues tenant-bound tokens',
    async (field) => {
      const refresh = token(
        userId,
        { tokenUse: 'refresh' },
        process.env.JWT_REFRESH_TOKEN_SECRET,
      );
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('x-tenant-id', 'RECYCLELENS')
        .send({ [field]: refresh })
        .expect(201);
      const body = responseBody<{
        access_token: string;
        refresh_token: string;
      }>(response);
      expect(
        jwt.verify<{ tenantId: string }>(body.access_token, {
          secret: process.env.JWT_SECRET!,
        }).tenantId,
      ).toBe('RECYCLELENS');
      expect(response.body).not.toHaveProperty('password');
    },
  );
  it('rejects cross-tenant refresh', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .set('x-tenant-id', 'OTHER')
      .send({
        refreshToken: token(
          userId,
          { tokenUse: 'refresh' },
          process.env.JWT_REFRESH_TOKEN_SECRET,
        ),
      })
      .expect(401);
  });
  it('rejects Google tokens for a different audience without creating an account', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          email: 'attacker@example.invalid',
          aud: 'another-client',
          iss: 'https://accounts.google.com',
          email_verified: 'true',
          exp: String(Math.floor(Date.now() / 1000) + 3600),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    try {
      await request(app.getHttpServer())
        .post('/auth/google/token')
        .set('x-tenant-id', 'RECYCLELENS')
        .send({ access_token: 'fixture-token' })
        .expect(401);
      expect(
        await prisma.user.findUnique({
          where: { email: 'attacker@example.invalid' },
        }),
      ).toBeNull();
    } finally {
      fetchMock.mockRestore();
    }
  });
  it('Google verification invalidates the password from an unverified pre-registration', async () => {
    const email = `${randomUUID()}@example.invalid`;
    const account = await prisma.user.create({
      data: {
        email,
        fullName: 'Unverified',
        password: await new BcryptProvider().hashPassword(password),
        isVerified: false,
      },
    });
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          email,
          aud: process.env.GOOGLE_CLIENT_ID,
          iss: 'https://accounts.google.com',
          email_verified: 'true',
          exp: String(Math.floor(Date.now() / 1000) + 3600),
        }),
        { status: 200 },
      ),
    );
    try {
      const response = await request(app.getHttpServer())
        .post('/auth/google/token')
        .set('x-tenant-id', 'RECYCLELENS')
        .send({ access_token: 'fixture-token' })
        .expect(201);
      expect(response.body).not.toHaveProperty('password');
      const current = await prisma.user.findUniqueOrThrow({
        where: { id: account.id },
      });
      expect(current.isVerified).toBe(true);
      expect(current.password).toBe('');
      expect(current.tokenVersion).toBe(1);
      await request(app.getHttpServer())
        .post('/auth/sign-in')
        .set('x-tenant-id', 'RECYCLELENS')
        .send({ email, password })
        .expect(401);
    } finally {
      fetchMock.mockRestore();
    }
  });
  it('signup exposes only userId/message and stores a purpose-bound digest', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .set('x-tenant-id', 'RECYCLELENS')
      .send({
        email: `${randomUUID()}@example.invalid`,
        fullName: 'New User',
        password,
      })
      .expect(201);
    expect(
      Object.keys(responseBody<Record<string, unknown>>(response)).sort(),
    ).toEqual(['message', 'userId']);
    const id = responseBody<{ userId: string }>(response).userId;
    const otp = await prisma.oTP.findFirstOrThrow({ where: { userId: id } });
    const code = delivery.sendOtp.mock.calls.at(-1)![1];
    expect(otp.code).not.toBe(code);
    expect(otp.purpose).toBe(OtpPurpose.email_verification);
    // An email verification code cannot reset a password.
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .set('x-tenant-id', 'RECYCLELENS')
      .send({ userId: id, otpCode: code, password, confirmPassword: password })
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .set('x-tenant-id', 'RECYCLELENS')
      .send({ userId: id, otpCode: code })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .set('x-tenant-id', 'RECYCLELENS')
      .send({ userId: id, otpCode: code })
      .expect(403);
  });
  it('forgot/reset preserves userId contract, never returns a code, consumes once and revokes prior tokens', async () => {
    const id = randomUUID();
    await prisma.user.create({
      data: {
        id,
        email: `${id}@example.invalid`,
        fullName: 'Reset User',
        password,
        isVerified: true,
      },
    });
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .set('x-tenant-id', 'RECYCLELENS')
      .send({ email: `${id}@example.invalid` })
      .expect(201);
    expect(responseBody<{ userId: string }>(response).userId).toBe(id);
    expect(response.body).not.toHaveProperty('code');
    const code = delivery.sendOtp.mock.calls.at(-1)![1];
    const payload = {
      userId: id,
      otpCode: code,
      password,
      confirmPassword: password,
    };
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .set('x-tenant-id', 'RECYCLELENS')
      .send({ userId: id, otpCode: code })
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .set('x-tenant-id', 'RECYCLELENS')
      .send(payload)
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .set('x-tenant-id', 'RECYCLELENS')
      .send(payload)
      .expect(403);
    await get('/users/me', id).expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .set('x-tenant-id', 'RECYCLELENS')
      .send({
        refreshToken: token(
          id,
          { tokenUse: 'refresh' },
          process.env.JWT_REFRESH_TOKEN_SECRET,
        ),
      })
      .expect(403);
  });
});
