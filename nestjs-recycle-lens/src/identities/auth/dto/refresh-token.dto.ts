import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Expose, Transform } from 'class-transformer';

export class refreshTokenDto {
  @Expose()
  @Transform(
    ({ value, obj }: { value: unknown; obj: { refresh_token?: unknown } }) =>
      value ?? obj.refresh_token,
  )
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  refreshToken: string;
}
