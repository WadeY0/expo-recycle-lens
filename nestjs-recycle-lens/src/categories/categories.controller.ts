import { ParseUUIDPipe } from '@nestjs/common';
import { QueryCategoryDto } from './dto/query-category.dto';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/identities/auth/guards/jwt.guard';
import { CategoriesService } from './providers/categories.service';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách danh mục' })
  findAll(@Query() query: QueryCategoryDto) {
    return this.categoriesService.findAll(
      query.status,
      query.type,
      query.keyword,
      query.page,
      query.perPage,
      false,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết danh mục' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }
}
