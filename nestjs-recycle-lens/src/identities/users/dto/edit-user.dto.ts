import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  ValidateIf,
  IsString,
  Min,
  Max,
  Length,
} from 'class-validator';
export class EditUserDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  @ApiPropertyOptional()
  fullName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  @ApiPropertyOptional({ nullable: true })
  age?: number | null;
}
