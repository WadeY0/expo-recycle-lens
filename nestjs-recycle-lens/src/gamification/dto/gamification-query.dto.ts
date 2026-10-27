import { Type } from 'class-transformer';
import { IsInt, Max, Min, Matches } from 'class-validator';
export class GamificationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  perPage = 20;
}

export class ChallengeKeyDto {
  @Matches(/^[a-z][a-z0-9_]{0,63}$/)
  key: string;
}
