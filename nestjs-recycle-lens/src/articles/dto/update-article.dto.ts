import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ArticleType, ContentStatus } from '@prisma/client';

export class UpdateArticleDto {
  @ApiPropertyOptional({ example: 'Bảo vệ rừng xanh' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Mô tả ngắn về bài viết' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Nội dung chi tiết bài viết...' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiPropertyOptional({ enum: ArticleType })
  @IsEnum(ArticleType)
  @IsOptional()
  type?: ArticleType;

  @ApiPropertyOptional({ description: 'ID của danh mục' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
