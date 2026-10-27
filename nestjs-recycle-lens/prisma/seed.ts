import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { CONTENT_CATEGORIES, CONTENT_ITEMS, contentHtml } from './data/content';
import { SEED_ACHIEVEMENTS, SEED_CHALLENGES } from './data/reference';
import { seedWaste } from '../src/waste/data/seed-waste';
import { WASTE_DATASET } from '../src/waste/data/waste.dataset';
import { BcryptProvider } from '../src/identities/auth/providers/bcrypt.provider';
import { GamificationService } from '../src/gamification/gamification.service';
import { periodsAt } from '../src/gamification/gamification.time';
import { TenantService } from '../src/common/services/tenant.service';
import { normalizeVisionResult } from '../src/vision/providers/vision-normalizer';
import { readGuidance } from '../src/waste/waste.service';
import { toJson } from '../src/waste/json';
import { getDatabaseUrl } from '../src/configs/infra/app.config';
import {
  getTenantDatabaseUrl,
  normalizeTenantId,
} from '../src/common/types/tenant-context';

// Public development-only credentials. Never use this account in production.
const DEMO_EMAIL = 'demo@recyclelens.test';
const DEMO_PASSWORD = 'RecycleLensDemo123!';

// Keep the previous seed IDs so existing sample records are not duplicated.
function seedId(entity: string, key: string) {
  const hex = createHash('sha256')
    .update(`recyclelens-demo-v1:${entity}:${key}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
const DEMO_USER_ID = seedId('user', 'demo');

function scanFixtures(cutoff: Date) {
  const anchor = new Date();
  if (cutoff > anchor) throw new Error('Gamification chưa được kích hoạt.');
  const day = 86400000;
  const today = periodsAt(anchor).daily.start.getTime();
  const days = [today - 2 * day, today - day, today]
    .map((start) => ({
      start: Math.max(start, cutoff.getTime()),
      end: Math.min(start + day - 1, anchor.getTime()),
    }))
    .filter((period) => period.start <= period.end);
  const counts =
    days.length === 3 ? [10, 11, 3] : days.length === 2 ? [21, 3] : [24];
  let index = 0;
  const recognized = days.flatMap((period, dayIndex) =>
    Array.from({ length: counts[dayIndex] }, (_, slot) => ({
      key: `recognized-${index}`,
      at: new Date(
        period.start +
          Math.floor(
            ((period.end - period.start) * (slot + 1)) / (counts[dayIndex] + 1),
          ),
      ),
      slug: WASTE_DATASET[index++ % WASTE_DATASET.length].slug,
      kind: 'recognized',
    })),
  );
  return [
    ...recognized,
    {
      key: 'uncertain',
      at: new Date(anchor.getTime() - 3 * day),
      slug: null,
      kind: 'uncertain',
    },
    {
      key: 'unknown',
      at: new Date(anchor.getTime() - 2 * day),
      slug: null,
      kind: 'unknown',
    },
    {
      key: 'unknown-hazard',
      at: new Date(anchor.getTime() - day),
      slug: null,
      kind: 'unknown-hazard',
    },
  ].sort(
    (a, b) => a.at.getTime() - b.at.getTime() || a.key.localeCompare(b.key),
  );
}

export async function seed(prisma: PrismaClient) {
  if (
    !['development', 'test'].includes(
      process.env.NODE_ENV?.trim() || 'development',
    )
  )
    throw new Error('Seed dữ liệu mẫu chỉ dùng cho development/test.');
  // Never replace an unrelated account that happens to have the demo email.
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });
  if (existing && existing.id !== DEMO_USER_ID)
    throw new Error('Email demo đang thuộc tài khoản khác; seed đã dừng.');

  await seedWaste(prisma);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(818082,47)`;
      await tx.achievementDefinition.createMany({
        data: SEED_ACHIEVEMENTS,
        skipDuplicates: true,
      });
      await tx.challengeDefinition.createMany({
        data: SEED_CHALLENGES,
        skipDuplicates: true,
      });
      const settings = await tx.gamificationSettings.upsert({
        where: { key: 'phase3' },
        update: {},
        create: { key: 'phase3' },
      });
      for (const category of CONTENT_CATEGORIES) {
        const id = seedId('category', category.key);
        await tx.category.upsert({
          where: { id },
          update: {},
          create: { id, title: category.title, type: category.type },
        });
      }
      for (const article of CONTENT_ITEMS) {
        const id = seedId('article', article.key);
        await tx.article.upsert({
          where: { id },
          update: {},
          create: {
            id,
            title: article.title,
            description: article.summary,
            content: contentHtml(article),
            type: article.type ?? 'post',
            categoryId: seedId('category', article.category),
            image: null,
          },
        });
      }

      const user = await tx.user.findUnique({ where: { email: DEMO_EMAIL } });
      if (user) {
        if (user.id !== DEMO_USER_ID)
          throw new Error(
            'Email demo đang thuộc tài khoản khác; seed đã dừng.',
          );
        if (user.role !== 'user' || !user.isVerified)
          throw new Error(
            'Demo hiện tại không còn là user đã xác minh; giữ nguyên tài khoản.',
          );
        // Preserve passwords, profile edits, unsaved favorites and new activity.
        return { demoCreated: false };
      }
      if (await tx.user.findUnique({ where: { id: DEMO_USER_ID } }))
        throw new Error('ID demo đang thuộc tài khoản khác; seed đã dừng.');

      const items = await tx.wasteItem.findMany({
        include: { article: { include: { category: true } } },
      });
      const catalog = items
        .filter(
          ({ article }) =>
            article.type === 'library' &&
            article.status === 'active' &&
            !article.deletedAt &&
            (!article.category ||
              (article.category.status === 'active' &&
                !article.category.deletedAt)),
        )
        .map((item) => ({
          slug: item.slug,
          articleId: item.articleId,
          name: item.article.title,
          nameEn: item.nameEn,
          materials: item.materials,
          aliases: item.aliases,
          guidance: readGuidance(item.guidance),
        }));
      const timeline = scanFixtures(settings.activatedAt);
      if (
        timeline.some(
          (entry) =>
            entry.slug && !catalog.some((item) => item.slug === entry.slug),
        )
      )
        throw new Error('Một mục waste mẫu chưa khả dụng trong thư viện.');

      const postFavorites = CONTENT_ITEMS.filter(
        (item) => (item.type ?? 'post') === 'post',
      )
        .filter((_, index) => index % 3 === 0)
        .slice(0, 6)
        .map((item) => seedId('article', item.key));
      const wasteFavorites = [
        'pet-bottle',
        'paper',
        'cardboard',
        'glass-bottle',
        'aluminium-can',
        'batteries',
      ].map((slug) => catalog.find((item) => item.slug === slug)?.articleId);
      if (wasteFavorites.some((id) => !id))
        throw new Error('Một mục favorite mẫu chưa khả dụng.');
      const favoriteIds = [...postFavorites, ...wasteFavorites] as string[];
      if (
        (await tx.article.count({
          where: {
            id: { in: favoriteIds },
            type: { in: ['post', 'library'] },
            status: 'active',
            deletedAt: null,
            category: { status: 'active', deletedAt: null },
          },
        })) !== favoriteIds.length
      )
        throw new Error(
          'Không tạo favorite cho nội dung riêng tư hoặc không hoạt động.',
        );

      await tx.user.create({
        data: {
          id: DEMO_USER_ID,
          email: DEMO_EMAIL,
          fullName: 'RecycleLens Demo',
          role: 'user',
          isVerified: true,
          password: await new BcryptProvider().hashPassword(DEMO_PASSWORD),
          createdAt: timeline[0].at,
        },
      });
      const gamification = new GamificationService({
        getPrismaClient: () => Promise.resolve(prisma),
      } as TenantService);
      for (const entry of timeline) {
        const item = catalog.find((waste) => waste.slug === entry.slug);
        const raw =
          entry.kind === 'recognized'
            ? {
                wasteClass: item!.slug,
                label: item!.name,
                material: item!.materials[0],
                uncertain: false,
              }
            : entry.kind === 'uncertain'
              ? {
                  wasteClass: 'pet-bottle',
                  label: 'Chai chưa rõ nhãn',
                  material: 'plastic',
                  uncertain: true,
                }
              : entry.kind === 'unknown-hazard'
                ? {
                    wasteClass: 'unknown',
                    label: 'Vật nghi chứa hóa chất',
                    hazardous: true,
                  }
                : { wasteClass: 'unknown', label: 'Vật không xác định' };
        const analysis = normalizeVisionResult(
          {
            ...raw,
            observations:
              'Dữ liệu demo tổng hợp; không phải phân tích từ ảnh hoặc AI thật.',
          },
          catalog,
        );
        const id = seedId('scan', entry.key);
        await tx.article.create({
          data: {
            id,
            createdById: DEMO_USER_ID,
            type: 'ai_scan',
            status: 'inactive',
            title: `[DEMO TỔNG HỢP] ${analysis.label}`,
            description:
              'Fixture học tập; không có ảnh hoặc phân tích AI thật.',
            content:
              '<p>Dữ liệu demo tổng hợp, không phải kết quả nhận dạng ảnh thật.</p>',
            image: null,
            createdAt: entry.at,
            scanAnalysis: {
              create: {
                wasteSlug: analysis.matchedWaste?.slug ?? null,
                result: toJson(analysis),
                createdAt: entry.at,
                provider: 'recyclelens-synthetic-seed',
                model: 'fixture-v1',
                requestUserId: DEMO_USER_ID,
                requestKey: `seed_demo_v1_${entry.key}`,
              },
            },
          },
        });
        await gamification.processScan(tx, id, DEMO_USER_ID);
      }
      await tx.articleLike.createMany({
        data: favoriteIds.map((articleId) => ({
          id: seedId('favorite', articleId),
          userId: DEMO_USER_ID,
          articleId,
        })),
        skipDuplicates: true,
      });
      return { demoCreated: true };
    },
    { timeout: 60000 },
  );
}

export function resolveSeedTarget(args: string[]) {
  if (!args.length) return { label: 'DATABASE_URL', url: getDatabaseUrl() };
  if (args.length !== 1 || !args[0].startsWith('--tenant='))
    throw new Error(
      'Dùng npm run seed hoặc npm run seed -- --tenant=TENANT_ID.',
    );
  const tenantId = normalizeTenantId(args[0].slice('--tenant='.length));
  return { label: tenantId, url: getTenantDatabaseUrl(tenantId) };
}

async function main() {
  const { label, url } = resolveSeedTarget(process.argv.slice(2));
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    const { demoCreated } = await seed(prisma);
    console.log(`Đã tạo/bổ sung dữ liệu mẫu cho ${label}.`);
    console.log(`Tài khoản demo: ${DEMO_EMAIL}`);
    console.log(
      demoCreated
        ? `Mật khẩu mẫu development: ${DEMO_PASSWORD}`
        : 'Demo đã tồn tại: giữ nguyên mật khẩu, profile, favorites và tiến độ.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    // Do not print database URLs, password hashes or provider credentials.
    console.error(
      error instanceof Error && !('code' in error)
        ? error.message
        : 'Seed thất bại. Kiểm tra kết nối và schema database.',
    );
    process.exitCode = 1;
  });
}
