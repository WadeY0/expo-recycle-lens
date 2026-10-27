import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UsersService } from './providers/users.service';
import { EditUserDto } from './dto/edit-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ScanImageService,
  MAX_SCAN_BYTES,
} from '../../vision/providers/scan-image.service';
import { ScanMediaService } from '../../vision/providers/scan-media.service';

@ApiTags('Users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UsersService,
    private readonly images: ScanImageService,
    private readonly media: ScanMediaService,
  ) {}

  @Patch()
  @ApiOperation({ summary: 'Edit own profile' })
  editUser(@GetUser('id') userId: string, @Body() dto: EditUserDto) {
    return this.userService.editUser(userId, dto);
  }

  @Patch('change-password')
  changePassword(
    @GetUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(userId, dto);
  }

  @Get('me')
  getMe(@GetUser('id') userId: string) {
    return this.userService.findOneById(userId);
  }

  @Post('upload-avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SCAN_BYTES, files: 1, fields: 0 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async uploadAvatar(
    @GetUser('id') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const buffer = await this.images.normalize(file);
    const uploaded = await this.media.upload(buffer, 'avatars');
    try {
      return await this.userService.uploadAvatar(userId, {
        path: uploaded.url,
      } as Express.Multer.File);
    } catch (error) {
      await this.media.remove(uploaded.publicId);
      throw error;
    }
  }
}
