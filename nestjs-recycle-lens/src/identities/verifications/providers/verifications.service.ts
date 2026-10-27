import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { OtpPurpose, Prisma } from '@prisma/client';
import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { TenantService } from 'src/common/services/tenant.service';

const MAX_ATTEMPTS = 5;
const LIFETIME_MS = 5 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;

@Injectable()
export class VerificationsService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly config: ConfigService,
  ) {}

  private digest(id: string, code: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`${id}:${code}`)
      .digest('hex');
  }

  private async lock(
    tx: Prisma.TransactionClient,
    userId: string,
    purpose: OtpPurpose,
  ) {
    // Serialize issuance and consumption across all API instances sharing this database.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${purpose}))`;
  }

  async generateAndSaveOtp(userId: string, purpose: OtpPurpose) {
    const prisma = await this.tenantService.getPrismaClient();
    const code = randomInt(100000, 1000000).toString();
    const id = randomUUID();
    await prisma.$transaction(async (tx) => {
      await this.lock(tx, userId, purpose);
      const latest = await tx.oTP.findFirst({
        where: { userId, purpose },
        orderBy: { createdAt: 'desc' },
      });
      if (latest && Date.now() - latest.createdAt.getTime() < RESEND_DELAY_MS) {
        throw new HttpException(
          'Please wait before requesting another code',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await tx.oTP.updateMany({
        where: { userId, purpose, isUsed: false },
        data: { isUsed: true },
      });
      await tx.oTP.create({
        data: {
          id,
          userId,
          purpose,
          code: this.digest(id, code),
          expiresAt: new Date(Date.now() + LIFETIME_MS),
        },
      });
    });
    // Internal email delivery only; controllers must not return this value.
    return { code };
  }

  async consumeAndApply<T>(
    userId: string,
    code: string,
    purpose: OtpPurpose,
    apply: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const prisma = await this.tenantService.getPrismaClient();
    const outcome = await prisma.$transaction(async (tx) => {
      await this.lock(tx, userId, purpose);
      const otp = await tx.oTP.findFirst({
        where: { userId, purpose },
        orderBy: { createdAt: 'desc' },
      });
      if (
        !otp ||
        otp.isUsed ||
        otp.expiresAt <= new Date() ||
        otp.attempts >= MAX_ATTEMPTS
      ) {
        return { valid: false as const };
      }
      const expected = Buffer.from(otp.code, 'hex');
      const supplied = Buffer.from(this.digest(otp.id, code), 'hex');
      if (
        expected.length !== supplied.length ||
        !timingSafeEqual(expected, supplied)
      ) {
        await tx.oTP.update({
          where: { id: otp.id },
          data: { attempts: { increment: 1 } },
        });
        // Return, rather than throw inside the transaction, so the failed attempt commits.
        return { valid: false as const };
      }
      await tx.oTP.update({ where: { id: otp.id }, data: { isUsed: true } });
      return { valid: true as const, value: await apply(tx) };
    });
    if (!outcome.valid) throw new ForbiddenException('Invalid or expired OTP');
    return outcome.value;
  }
}
