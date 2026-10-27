import {
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/identities/auth/guards/jwt.guard';
import { GetUser } from 'src/identities/auth/decorators/get-user.decorator';
import { QueryWasteDto } from './dto/query-waste.dto';
import { WasteService } from './waste.service';
@ApiTags('Waste Library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('waste')
export class WasteController {
  constructor(private readonly waste: WasteService) {}
  @Get('filters')
  @ApiOperation({ summary: 'Danh mục và chất liệu chuẩn' })
  filters() {
    return this.waste.filters();
  }
  @Get('favorites')
  @ApiOperation({ summary: 'Danh sách rác đã lưu của tôi' })
  favorites(@Query() query: QueryWasteDto, @GetUser('id') id: string) {
    return this.waste.list(query, id, true);
  }
  @Get()
  @ApiOperation({ summary: 'Tìm kiếm/lọc thư viện rác chuẩn' })
  list(@Query() query: QueryWasteDto, @GetUser('id') id: string) {
    return this.waste.list(query, id);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết rác theo slug hoặc Article ID' })
  detail(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.waste.detail(id, userId);
  }
  @Put(':id/favorite')
  @ApiOperation({ summary: 'Lưu rác, idempotent' })
  save(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.waste.favorite(id, userId, true);
  }
  @Delete(':id/favorite')
  @ApiOperation({ summary: 'Bỏ lưu rác, idempotent' })
  unsave(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.waste.favorite(id, userId, false);
  }
}
