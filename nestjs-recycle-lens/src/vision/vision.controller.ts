import {
  Controller,
  Get,
  Headers,
  Param,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_SCAN_BYTES } from './providers/scan-image.service';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from 'src/identities/auth/guards/jwt.guard';
import { GetUser } from 'src/identities/auth/decorators/get-user.decorator';
import { QueryVisionDto } from './dto/query-vision.dto';
import { ArticlesService } from 'src/articles/providers/articles.service';
import { VisionService } from './providers/vision.service';

@ApiTags('Vision')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vision')
export class VisionController {
  constructor(
    private readonly visionService: VisionService,
    private readonly articlesService: ArticlesService,
  ) {}

  @Post('analyze-waste')
  @ApiOperation({
    summary: 'Upload ảnh rác thải để phân tích và lưu lịch sử riêng tư',
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SCAN_BYTES, files: 1, fields: 0 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh rác thải cần phân tích',
        },
      },
      required: ['image'],
    },
  })
  analyzeWaste(
    @UploadedFile() file: Express.Multer.File,
    @GetUser('id') userId: string,
    @Headers('idempotency-key') requestKey?: string,
  ) {
    return this.visionService.analyzeAndSave(file, userId, requestKey);
  }

  @Get('my')
  @ApiOperation({ summary: 'Danh sách ảnh rác đã phân tích của tôi' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  findMyVisions(@Query() query: QueryVisionDto, @GetUser('id') userId: string) {
    return this.articlesService.findMyVisions(userId, query);
  }

  @Get('my/:id')
  @ApiOperation({ summary: 'Chi tiết ảnh rác đã phân tích của tôi' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  findOneMyVision(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.articlesService.findOneMyVision(id, userId);
  }
}
