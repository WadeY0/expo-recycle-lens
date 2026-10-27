import { ConfigService } from '@nestjs/config';
import { PrismaClient, OtpPurpose } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { VerificationsService } from '../src/identities/verifications/providers/verifications.service';
import { TenantService } from '../src/common/services/tenant.service';

describe('OTP PostgreSQL transaction behavior', () => {
  let prisma: PrismaClient;
  let service: VerificationsService;
  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.TEST_DATABASE_URL!,
      }),
    });
    service = new VerificationsService(
      { getPrismaClient: () => Promise.resolve(prisma) } as TenantService,
      new ConfigService({ JWT_SECRET: process.env.JWT_SECRET }),
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  async function issue() {
    const userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.invalid`,
        fullName: 'OTP Test',
        password: '',
      },
    });
    const { code } = await service.generateAndSaveOtp(
      userId,
      OtpPurpose.password_reset,
    );
    return { userId, code };
  }
  function consume(userId: string, code: string) {
    return service.consumeAndApply(
      userId,
      code,
      OtpPurpose.password_reset,
      () => Promise.resolve('consumed'),
    );
  }
  it('persists failed attempts and blocks the correct code after five failures', async () => {
    const { userId, code } = await issue();
    const wrong = code === '123456' ? '654321' : '123456';
    for (let i = 0; i < 5; i++)
      await expect(consume(userId, wrong)).rejects.toThrow(
        'Invalid or expired OTP',
      );
    expect(
      (await prisma.oTP.findFirstOrThrow({ where: { userId } })).attempts,
    ).toBe(5);
    await expect(consume(userId, code)).rejects.toThrow(
      'Invalid or expired OTP',
    );
  });
  it('rejects an expired code', async () => {
    const { userId, code } = await issue();
    await prisma.oTP.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(consume(userId, code)).rejects.toThrow(
      'Invalid or expired OTP',
    );
  });
  it('allows only one winner under simultaneous redemption', async () => {
    const { userId, code } = await issue();
    const results = await Promise.allSettled([
      consume(userId, code),
      consume(userId, code),
    ]);
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((x) => x.status === 'rejected')).toHaveLength(1);
  });
  it('rolls back consumption when the protected action fails', async () => {
    const { userId, code } = await issue();
    await expect(
      service.consumeAndApply(userId, code, OtpPurpose.password_reset, () =>
        Promise.reject(new Error('action failed')),
      ),
    ).rejects.toThrow('action failed');
    await expect(consume(userId, code)).resolves.toBe('consumed');
  });
  it('throttles issuance, including simultaneous resend requests', async () => {
    const { userId } = await issue();
    await expect(
      service.generateAndSaveOtp(userId, OtpPurpose.password_reset),
    ).rejects.toThrow('Please wait');
    expect(await prisma.oTP.count({ where: { userId } })).toBe(1);
  });
  it('rejects pre-migration OTP records whose purpose is unknown', async () => {
    const userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.invalid`,
        fullName: 'Legacy',
        password: '',
      },
    });
    await prisma.oTP.create({
      data: { userId, code: '123456', expiresAt: new Date(Date.now() + 60000) },
    });
    await expect(consume(userId, '123456')).rejects.toThrow(
      'Invalid or expired OTP',
    );
  });
});
