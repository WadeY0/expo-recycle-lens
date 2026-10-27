import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CategoryType, ContentStatus } from '@prisma/client';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Môi trường', description: 'Tiêu đề danh mục' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Các bài viết về môi trường xanh' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiPropertyOptional({ enum: CategoryType, description: 'Loại danh mục: post (bài viết) hoặc library (thư viện)' })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;
}
