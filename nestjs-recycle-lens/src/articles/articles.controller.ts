import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/identities/auth/guards/jwt.guard';
import { GetUser } from 'src/identities/auth/decorators/get-user.decorator';
import { ArticlesService } from './providers/articles.service';
import { QueryArticleDto } from './dto/query-article.dto';
import { QueryLikedArticleDto } from './dto/query-liked-article.dto';

@ApiTags('Articles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài viết' })
  findAll(@Query() query: QueryArticleDto, @GetUser('id') userId: string) {
    return this.articlesService.findAll(query, userId);
  }

  @Get('liked')
  @ApiOperation({ summary: 'Danh sách bài viết đã thích' })
  findLiked(
    @Query() query: QueryLikedArticleDto,
    @GetUser('id') userId: string,
  ) {
    return this.articlesService.findLiked(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết bài viết' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    return this.articlesService.findOne(id, userId);
  }

  @Put(':id/favorite')
  @ApiOperation({ summary: 'Lưu bài viết (idempotent)' })
  save(@Param('id', ParseUUIDPipe) id: string, @GetUser('id') userId: string) {
    return this.articlesService.setFavorite(id, userId, true);
  }

  @Delete(':id/favorite')
  @ApiOperation({ summary: 'Bỏ lưu bài viết (idempotent)' })
  unsave(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    return this.articlesService.setFavorite(id, userId, false);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Thích / Bỏ thích bài viết (toggle)' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  toggleLike(
    @Param('id', ParseUUIDPipe) articleId: string,
    @GetUser('id') userId: string,
  ) {
    return this.articlesService.toggleLike(articleId, userId);
  }
}
