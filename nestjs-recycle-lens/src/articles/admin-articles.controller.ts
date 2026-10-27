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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/identities/auth/guards/jwt.guard';
import { RolesGuard } from 'src/identities/auth/guards/roles.guard';
import { Roles } from 'src/identities/auth/decorators/roles.decorator';
import { ERole } from 'src/identities/auth/enums/role.enum';
import { GetUser } from 'src/identities/auth/decorators/get-user.decorator';
import { storage } from 'src/cloudinary/cloudinary.storage';
import { ArticlesService } from './providers/articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';

@ApiTags('Admin - Articles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ERole.ADMIN)
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @ApiOperation({ summary: '[Admin] Tạo bài viết mới' })
  @UseInterceptors(FileInterceptor('image', { storage }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        content: { type: 'string' },
        image: { type: 'string', format: 'binary' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        type: { type: 'string', enum: ['post', 'library'] },
        categoryId: { type: 'string', format: 'uuid' },
      },
      required: ['title', 'content'],
    },
  })
  create(
    @Body() dto: CreateArticleDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.articlesService.create(dto, file);
  }

  @Get()
  @ApiOperation({ summary: '[Admin] Lấy danh sách bài viết' })
  findAll(@Query() query: QueryArticleDto, @GetUser('id') userId: string) {
    return this.articlesService.findAll(query, userId, true);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Lấy chi tiết bài viết' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.articlesService.findOne(id, userId, true);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Cập nhật bài viết' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  @UseInterceptors(FileInterceptor('image', { storage }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        content: { type: 'string' },
        image: { type: 'string', format: 'binary' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        type: { type: 'string', enum: ['post', 'library'] },
        categoryId: { type: 'string', format: 'uuid' },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.articlesService.update(id, dto, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Xóa mềm bài viết' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id);
  }
}
