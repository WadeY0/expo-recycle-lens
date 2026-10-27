import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsByteLength,
  Length,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';

export class SignUpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    format: 'email',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123',
    description: 'User password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @IsByteLength(1, 72, { message: 'Mật khẩu tối đa 72 byte UTF-8.' })
  @MaxLength(72)
  @MinLength(8)
  password: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  @IsNotEmpty()
  @ApiProperty()
  fullName: string;

  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  @ApiProperty()
  age?: number;
}
