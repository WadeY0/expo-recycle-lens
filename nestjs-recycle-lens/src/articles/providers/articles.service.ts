import { publicArticleWhere } from '../article-visibility';
import { scanClassification } from '../../vision/scan-classification';
import { visionResultFields } from '../../vision/vision-response';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ArticleType,
  ContentStatus,
  PrismaClient,
  Prisma,
} from '@prisma/client';
import { TenantService } from 'src/common/services/tenant.service';
import { CreateArticleDto } from '../dto/create-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { ArticleSortBy, QueryArticleDto } from '../dto/query-article.dto';
import { QueryVisionDto } from '../../vision/dto/query-vision.dto';
import { QueryLikedArticleDto } from '../dto/query-liked-article.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly tenantService: TenantService) {}

  private async getTenantPrisma(): Promise<PrismaClient> {
    return await this.tenantService.getPrismaClient();
  }

  async create(dto: CreateArticleDto, file?: Express.Multer.File) {
    const prisma = await this.getTenantPrisma();
    const image = file?.path ?? null;
    return prisma.article.create({
      data: { ...dto, image },
      include: { category: true },
    });
  }

  async findAll(query: QueryArticleDto, userId?: string, admin = false) {
    const prisma = await this.getTenantPrisma();
    const page = Math.max(Number(query.page) || 1, 1);
    const perPage = Math.max(Number(query.perPage) || 10, 1);
    const skip = (page - 1) * perPage;

    const where: Prisma.ArticleWhereInput = { deletedAt: null };
    if (admin) {
      where.status = query.status;
    } else {
      where.status = ContentStatus.active;
      where.AND = [
        publicArticleWhere,
        ...(query.status && query.status !== ContentStatus.active
          ? [{ id: { in: [] } }]
          : []),
      ];
    }
    if (query.type) where.type = query.type;
    if (query.type === ArticleType.library && query.libraryScope) {
      where.wasteItem =
        query.libraryScope === 'legacy' ? { is: null } : { isNot: null };
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    const sortByMap: Record<
      ArticleSortBy,
      Prisma.ArticleOrderByWithRelationInput
    > = {
      [ArticleSortBy.TitleAsc]: { title: 'asc' },
      [ArticleSortBy.TitleDesc]: { title: 'desc' },
      [ArticleSortBy.Latest]: { createdAt: 'desc' },
      [ArticleSortBy.Oldest]: { createdAt: 'asc' },
    };
    const orderBy = sortByMap[query.sortBy ?? ArticleSortBy.Latest];

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: perPage,
        orderBy: [orderBy, { id: 'asc' }],
        include: {
          category: { select: { id: true, title: true } },
          _count: { select: { likes: true } },
        },
      }),
      prisma.article.count({ where }),
    ]);

    let likedIds = new Set<string>();
    if (userId && articles.length > 0) {
      const articleIds = articles.map((a) => a.id);
      const likes = await prisma.articleLike.findMany({
        where: { userId, articleId: { in: articleIds } },
        select: { articleId: true },
      });
      likedIds = new Set(likes.map((l) => l.articleId));
    }

    const data = articles.map((a) => ({ ...a, isLiked: likedIds.has(a.id) }));

    return {
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async findOne(id: string, userId?: string, admin = false) {
    const prisma = await this.getTenantPrisma();
    const article = await prisma.article.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(admin
          ? {}
          : {
              ...publicArticleWhere,
            }),
      },
      include: {
        wasteItem: true,
        category: { select: { id: true, title: true } },
        _count: { select: { likes: true } },
      },
    });
    if (!article) throw new NotFoundException(`Article not found`);

    let isLiked = false;
    if (userId) {
      const like = await prisma.articleLike.findUnique({
        where: { userId_articleId: { userId, articleId: id } },
      });
      isLiked = !!like;
    }

    return { ...article, isLiked };
  }

  async update(id: string, dto: UpdateArticleDto, file?: Express.Multer.File) {
    const prisma = await this.getTenantPrisma();
    const article = await prisma.article.findFirst({
      where: { id, deletedAt: null },
    });
    if (!article) throw new NotFoundException(`Article not found`);
    const data: Prisma.ArticleUncheckedUpdateInput = { ...dto };
    if (file?.path) data.image = file.path;
    return prisma.article.update({
      where: { id },
      data,
      include: { category: { select: { id: true, title: true } } },
    });
  }

  async remove(id: string) {
    const prisma = await this.getTenantPrisma();
    const article = await prisma.article.findFirst({
      where: { id, deletedAt: null },
    });
    if (!article) throw new NotFoundException(`Article not found`);
    await prisma.article.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Article deleted successfully' };
  }

  async setFavorite(articleId: string, userId: string, saved: boolean) {
    const prisma = await this.getTenantPrisma();
    return prisma.$transaction(async (tx) => {
      const article = await tx.article.findFirst({
        where: { id: articleId, ...publicArticleWhere },
        select: { id: true },
      });
      if (!article) throw new NotFoundException('Article not found');
      if (saved) {
        await tx.articleLike.createMany({
          data: { userId, articleId },
          skipDuplicates: true,
        });
      } else {
        await tx.articleLike.deleteMany({ where: { userId, articleId } });
      }
      return {
        isLiked: saved,
        likeCount: await tx.articleLike.count({ where: { articleId } }),
      };
    });
  }

  async toggleLike(articleId: string, userId: string) {
    const prisma = await this.getTenantPrisma();
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        ...publicArticleWhere,
      },
    });
    if (!article) throw new NotFoundException(`Article not found`);

    const existing = await prisma.articleLike.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });

    if (existing) {
      await prisma.articleLike.delete({
        where: { userId_articleId: { userId, articleId } },
      });
      const likeCount = await prisma.articleLike.count({
        where: { articleId },
      });
      return { isLiked: false, likeCount };
    } else {
      await prisma.articleLike.create({ data: { userId, articleId } });
      const likeCount = await prisma.articleLike.count({
        where: { articleId },
      });
      return { isLiked: true, likeCount };
    }
  }

  async findLiked(userId: string, query: QueryLikedArticleDto) {
    const prisma = await this.getTenantPrisma();
    const page = Math.max(Number(query.page) || 1, 1);
    const perPage = Math.max(Number(query.perPage) || 10, 1);
    const skip = (page - 1) * perPage;

    const likeWhere: Prisma.ArticleLikeWhereInput = { userId };
    const articleWhere: Prisma.ArticleWhereInput = {
      deletedAt: null,
      status: ContentStatus.active,
      AND: [publicArticleWhere],
    };
    if (query.categoryId) articleWhere.categoryId = query.categoryId;
    if (query.type) articleWhere.type = query.type;
    if (query.type === ArticleType.library && query.libraryScope) {
      articleWhere.wasteItem =
        query.libraryScope === 'legacy' ? { is: null } : { isNot: null };
    }
    if (query.keyword) {
      articleWhere.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    likeWhere.article = articleWhere;

    const [likes, total] = await Promise.all([
      prisma.articleLike.findMany({
        where: likeWhere,
        skip,
        take: perPage,
        orderBy: [
          {
            article:
              query.sortBy === ArticleSortBy.TitleAsc
                ? { title: 'asc' }
                : query.sortBy === ArticleSortBy.TitleDesc
                  ? { title: 'desc' }
                  : query.sortBy === ArticleSortBy.Oldest
                    ? { createdAt: 'asc' }
                    : { createdAt: 'desc' },
          },
          { articleId: 'asc' },
        ],
        select: {
          article: {
            select: {
              id: true,
              title: true,
              description: true,
              image: true,
              type: true,
              status: true,
              createdAt: true,
              category: { select: { id: true, title: true } },
              _count: { select: { likes: true } },
            },
          },
        },
      }),
      prisma.articleLike.count({ where: likeWhere }),
    ]);

    const data = likes.map((l) => ({ ...l.article, isLiked: true }));
    return {
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async findMyVisions(userId: string, query: QueryVisionDto) {
    const prisma = await this.getTenantPrisma();
    const page = Math.max(Number(query.page) || 1, 1);
    const perPage = Math.max(Number(query.perPage) || 10, 1);
    const skip = (page - 1) * perPage;

    const where: Prisma.ArticleWhereInput = {
      deletedAt: null,
      createdById: userId,
      type: ArticleType.ai_scan,
    };
    if (query.keyword) {
      where.title = { contains: query.keyword, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: perPage,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: {
          scanAnalysis: {
            select: {
              result: true,
              wasteSlug: true,
              wasteItem: {
                select: {
                  slug: true,
                  articleId: true,
                  article: {
                    select: {
                      title: true,
                      status: true,
                      deletedAt: true,
                      category: { select: { status: true, deletedAt: true } },
                    },
                  },
                },
              },
            },
          },
          id: true,
          title: true,
          image: true,
          type: true,
          createdAt: true,
        },
      }),
      prisma.article.count({ where }),
    ]);

    return {
      data: data.map(({ scanAnalysis, ...item }) => ({
        ...item,
        classification: scanClassification(scanAnalysis),
      })),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async findOneMyVision(id: string, userId: string) {
    const prisma = await this.getTenantPrisma();
    const article = await prisma.article.findFirst({
      where: {
        id,
        deletedAt: null,
        createdById: userId,
        type: ArticleType.ai_scan,
      },
      include: {
        scanAnalysis: true,
        category: { select: { id: true, title: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { likes: true } },
      },
    });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');

    const like = await prisma.articleLike.findUnique({
      where: { userId_articleId: { userId, articleId: id } },
    });

    return { ...article, isLiked: !!like, ...visionResultFields(article) };
  }
}
