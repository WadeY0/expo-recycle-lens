import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
} from 'class-validator';
import { ArticleType, ContentStatus } from '@prisma/client';

export enum ArticleSortBy {
  TitleAsc = 'title_asc',
  TitleDesc = 'title_desc',
  Latest = 'latest',
  Oldest = 'oldest',
}

export class QueryArticleDto {
  @ApiPropertyOptional({
    enum: ['canonical', 'legacy'],
    description: 'Library content scope; no data is moved',
  })
  @IsOptional()
  @IsIn(['canonical', 'legacy'])
  libraryScope?: 'canonical' | 'legacy';

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiPropertyOptional({ enum: ArticleType })
  @IsEnum(ArticleType)
  @IsOptional()
  type?: ArticleType;

  @ApiPropertyOptional({ description: 'Lọc theo danh mục' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsInt()
  @Min(1)
  @Max(1000000)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Số bài mỗi trang', default: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  perPage?: number;

  @ApiPropertyOptional({
    enum: ArticleSortBy,
    description:
      'Sắp xếp: title_asc (A-Z), title_desc (Z-A), latest (mới nhất), oldest (cũ nhất)',
    default: ArticleSortBy.Latest,
  })
  @IsEnum(ArticleSortBy)
  @IsOptional()
  sortBy?: ArticleSortBy;
}
