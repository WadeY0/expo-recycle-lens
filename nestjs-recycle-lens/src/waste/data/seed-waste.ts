import { ArticleType, CategoryType, PrismaClient } from '@prisma/client';
import {
  catalogId,
  normalizeTerm,
  WASTE_CATEGORIES,
  WASTE_DATASET,
} from './waste.dataset';
import { toJson } from '../json';

// Add-only and repeatable. Never overwrites existing content, likes or categories.
export async function seedWaste(prisma: PrismaClient) {
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(818082, 1)`;
      for (const category of WASTE_CATEGORIES) {
        await tx.category.upsert({
          where: { id: catalogId('category', category.key) },
          update: {},
          create: {
            id: catalogId('category', category.key),
            title: category.name,
            type: CategoryType.library,
          },
        });
      }
      for (const item of WASTE_DATASET) {
        if (await tx.wasteItem.findUnique({ where: { slug: item.slug } }))
          continue;
        // A deterministic ID collision aborts instead of altering an unrelated Article.
        const article = await tx.article.create({
          data: {
            id: catalogId('article', item.slug),
            title: item.name,
            description: item.nameEn,
            content:
              '<p>Hướng dẫn có cấu trúc được cung cấp qua API thư viện RecycleLens.</p>',
            type: ArticleType.library,
            categoryId: catalogId('category', item.category),
          },
        });
        await tx.wasteItem.create({
          data: {
            slug: item.slug,
            articleId: article.id,
            nameEn: item.nameEn,
            aliases: item.aliases,
            materials: item.materials,
            searchText: normalizeTerm(
              [
                item.name,
                item.nameEn,
                ...item.aliases,
                ...item.guidance.examples,
                ...item.guidance.keywords,
              ].join(' '),
            ),
            guidance: toJson(item.guidance),
            version: item.guidance.version,
          },
        });
      }
    },
    { timeout: 30000 },
  );
}
