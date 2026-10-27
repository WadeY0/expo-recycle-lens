import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ArticleType, ContentStatus, Prisma, WasteItem } from '@prisma/client';
import { TenantService } from 'src/common/services/tenant.service';
import { isUUID } from 'class-validator';
import { MATERIALS, normalizeTerm } from './data/waste.dataset';
import { QueryWasteDto } from './dto/query-waste.dto';
import { WasteGuidance, WasteSummary } from './waste.types';

const visibleArticle: Prisma.ArticleWhereInput = {
  deletedAt: null,
  status: ContentStatus.active,
  type: ArticleType.library,
  category: { deletedAt: null, status: ContentStatus.active },
};
export function readGuidance(value: Prisma.JsonValue): WasteGuidance {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !Array.isArray(value.disposal) ||
    !Array.isArray(value.preparation) ||
    !Array.isArray(value.provenance) ||
    !Array.isArray(value.warnings)
  )
    throw new ServiceUnavailableException('Library guidance is unavailable');
  return value as unknown as WasteGuidance;
}
@Injectable()
export class WasteService {
  constructor(private readonly tenants: TenantService) {}
  async filters() {
    const prisma = await this.tenants.getPrismaClient();
    const categories = await prisma.category.findMany({
      where: {
        deletedAt: null,
        status: 'active',
        type: 'library',
        articles: { some: { ...visibleArticle, wasteItem: { isNot: null } } },
      },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    });
    return { categories, materials: MATERIALS };
  }
  async list(query: QueryWasteDto, userId: string, favorites = false) {
    const prisma = await this.tenants.getPrismaClient();
    const where: Prisma.WasteItemWhereInput = {
      ...(query.keyword
        ? {
            searchText: {
              contains: normalizeTerm(query.keyword),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.material ? { materials: { has: query.material } } : {}),
      article: {
        ...visibleArticle,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(favorites ? { likes: { some: { userId } } } : {}),
      },
    };
    const [items, total] = await Promise.all([
      prisma.wasteItem.findMany({
        where,
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        orderBy: { slug: 'asc' },
        include: {
          article: {
            include: {
              category: { select: { id: true, title: true } },
              likes: { where: { userId }, select: { id: true } },
            },
          },
        },
      }),
      prisma.wasteItem.count({ where }),
    ]);
    return {
      data: items.map((item) => this.response(item)),
      total,
      page: query.page,
      perPage: query.perPage,
      totalPages: Math.ceil(total / query.perPage),
    };
  }
  private response(
    item: WasteItem & {
      article: {
        id: string;
        title: string;
        image: string | null;
        category: { id: string; title: string } | null;
        likes: { id: string }[];
      };
    },
  ) {
    return {
      slug: item.slug,
      articleId: item.articleId,
      name: item.article.title,
      nameEn: item.nameEn,
      aliases: item.aliases,
      materials: item.materials,
      image: item.article.image,
      category: item.article.category,
      isFavorite: item.article.likes.length > 0,
      guidance: readGuidance(item.guidance),
      version: item.version,
    };
  }
  async detail(id: string, userId: string) {
    const prisma = await this.tenants.getPrismaClient();
    const item = await prisma.wasteItem.findFirst({
      where: {
        article: visibleArticle,
        OR: [{ slug: id }, ...(isUUID(id) ? [{ articleId: id }] : [])],
      },
      include: {
        article: {
          include: {
            category: { select: { id: true, title: true } },
            likes: { where: { userId }, select: { id: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Waste item not found');
    return this.response(item);
  }
  async favorite(id: string, userId: string, saved: boolean) {
    const item = await this.detail(id, userId);
    const prisma = await this.tenants.getPrismaClient();
    if (saved)
      await prisma.articleLike.createMany({
        data: { userId, articleId: item.articleId },
        skipDuplicates: true,
      });
    else
      await prisma.articleLike.deleteMany({
        where: { userId, articleId: item.articleId },
      });
    return { articleId: item.articleId, isFavorite: saved };
  }
  async matchingCatalog(): Promise<(WasteSummary & { aliases: string[] })[]> {
    const prisma = await this.tenants.getPrismaClient();
    const rows = await prisma.wasteItem.findMany({
      where: { article: visibleArticle },
      include: { article: { select: { title: true } } },
    });
    return rows.map((row) => ({
      slug: row.slug,
      articleId: row.articleId,
      name: row.article.title,
      nameEn: row.nameEn,
      materials: row.materials,
      aliases: row.aliases,
      guidance: readGuidance(row.guidance),
    }));
  }
}
