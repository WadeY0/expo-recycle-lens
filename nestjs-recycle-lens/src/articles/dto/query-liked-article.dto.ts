import { OmitType } from '@nestjs/swagger';
import { QueryArticleDto } from './query-article.dto';

export class QueryLikedArticleDto extends OmitType(QueryArticleDto, [
  'status',
] as const) {}
