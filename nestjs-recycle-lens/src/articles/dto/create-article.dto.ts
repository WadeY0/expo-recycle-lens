import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ArticleType, ContentStatus } from '@prisma/client';

export class CreateArticleDto {
  @ApiProperty({ example: 'Bảo vệ rừng xanh', description: 'Tiêu đề bài viết' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Mô tả ngắn về bài viết' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Nội dung chi tiết bài viết...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.active })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiPropertyOptional({ enum: ArticleType, default: ArticleType.post })
  @IsEnum(ArticleType)
  @IsOptional()
  type?: ArticleType;

  @ApiPropertyOptional({ description: 'ID của danh mục' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
