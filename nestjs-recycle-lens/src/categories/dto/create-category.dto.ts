import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CategoryType, ContentStatus } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Môi trường', description: 'Tiêu đề danh mục' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Các bài viết về môi trường xanh', description: 'Mô tả danh mục' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.active })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiPropertyOptional({ enum: CategoryType, default: CategoryType.post, description: 'Loại danh mục: post (bài viết) hoặc library (thư viện)' })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;
}
