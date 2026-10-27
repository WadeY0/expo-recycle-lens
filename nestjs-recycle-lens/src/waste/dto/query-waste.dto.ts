import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MATERIALS } from '../data/waste.dataset';
export class QueryWasteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  @ApiPropertyOptional({ enum: MATERIALS.map((m) => m.id) })
  @IsOptional()
  @IsIn(MATERIALS.map((m) => m.id))
  material?: string;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  perPage = 20;
}
