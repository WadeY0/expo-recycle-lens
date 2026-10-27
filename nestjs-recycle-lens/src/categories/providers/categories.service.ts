import { publicArticleWhere } from '../../articles/article-visibility';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CategoryType,
  PrismaClient,
  ContentStatus,
  Prisma,
} from '@prisma/client';
import { TenantService } from 'src/common/services/tenant.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly tenantService: TenantService) {}

  private async getTenantPrisma(): Promise<PrismaClient> {
    return await this.tenantService.getPrismaClient();
  }

  async create(dto: CreateCategoryDto) {
    const prisma = await this.getTenantPrisma();
    return prisma.category.create({ data: dto });
  }

  async findAll(
    status?: ContentStatus,
    type?: CategoryType,
    keyword?: string,
    page = 1,
    perPage = 10,
    admin = false,
  ) {
    const prisma = await this.getTenantPrisma();
    page = Math.max(Number(page) || 1, 1);
    perPage = Math.max(Number(perPage) || 10, 1);
    const skip = (page - 1) * perPage;

    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      status: admin ? status : 'active',
    };
    if (!admin && status === 'inactive') where.id = { in: [] };
    if (type) where.type = type;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: perPage,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          _count: {
            select: { articles: admin ? true : { where: publicArticleWhere } },
          },
        },
      }),
      prisma.category.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async findOne(id: string, admin = false) {
    const prisma = await this.getTenantPrisma();
    const category = await prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(admin ? {} : { status: ContentStatus.active }),
      },
      include: {
        _count: {
          select: { articles: admin ? true : { where: publicArticleWhere } },
        },
      },
    });
    if (!category) throw new NotFoundException(`Category not found`);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const prisma = await this.getTenantPrisma();
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) throw new NotFoundException(`Category not found`);
    return prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const prisma = await this.getTenantPrisma();
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) throw new NotFoundException(`Category not found`);
    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Category deleted successfully' };
  }
}
