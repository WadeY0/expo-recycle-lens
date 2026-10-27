import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  Min,
  Max,
  MaxLength,
  IsOptional,
  IsString,
} from 'class-validator';

export class QueryVisionDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo tiêu đề' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Số bài mỗi trang', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  perPage?: number;
}
