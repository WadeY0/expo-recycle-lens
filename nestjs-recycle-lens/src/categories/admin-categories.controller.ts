import { ParseUUIDPipe } from '@nestjs/common';
import { QueryCategoryDto } from './dto/query-category.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { RolesGuard } from 'src/identities/auth/guards/roles.guard';
import { Roles } from 'src/identities/auth/decorators/roles.decorator';
import { ERole } from 'src/identities/auth/enums/role.enum';
import { CategoriesService } from './providers/categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Admin - Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ERole.ADMIN)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: '[Admin] Tạo danh mục mới' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '[Admin] Lấy danh sách danh mục' })
  findAll(@Query() query: QueryCategoryDto) {
    return this.categoriesService.findAll(
      query.status,
      query.type,
      query.keyword,
      query.page,
      query.perPage,
      true,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Lấy chi tiết danh mục' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id, true);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Cập nhật danh mục' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Xóa mềm danh mục' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
