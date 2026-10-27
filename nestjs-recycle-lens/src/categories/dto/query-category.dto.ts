import { OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CategoryType } from '@prisma/client';
import { QueryArticleDto } from '../../articles/dto/query-article.dto';

export class QueryCategoryDto extends OmitType(QueryArticleDto, [
  'type',
  'categoryId',
  'libraryScope',
  'sortBy',
] as const) {
  @ApiPropertyOptional({ enum: CategoryType })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;
}
