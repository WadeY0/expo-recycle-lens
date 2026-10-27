import { Prisma } from '@prisma/client';

// One boundary for public articles, saved content and public category counts.
export const publicArticleWhere: Prisma.ArticleWhereInput = {
  deletedAt: null,
  status: 'active',
  type: { not: 'ai_scan' },
  OR: [
    { categoryId: null },
    { category: { is: { deletedAt: null, status: 'active' } } },
  ],
};
