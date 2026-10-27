import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { AdminService } from './admin.service';
import { EditUserDto } from '../users/dto/edit-user.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ERole } from '../auth/enums/role.enum';
import { ChangeRoleDto } from './dto/change-role.dto';

@ApiTags('Admin User')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ERole.ADMIN)
export class AdminController {
  constructor(private readonly AdminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Admin get all users' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  async getAllUsers(
    @Query('role') role?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.AdminService.getAllUsers(role, keyword, page, perPage);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Admin get user by ID' })
  async getUserById(@Param('id') id: string) {
    return this.AdminService.getUserById(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Admin create user' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.AdminService.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Admin edit user' })
  async editUser(@Param('id') id: string, @Body() dto: EditUserDto) {
    return this.AdminService.editUser(id, dto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin delete user' })
  async deleteUser(@Param('id') id: string) {
    return this.AdminService.deleteUser(id);
  }

  @Get('users/stats/overview')
  @ApiOperation({ summary: 'Get user statistics overview' })
  async getUserStats() {
    return this.AdminService.getUserStats();
  }

  @Patch('users/:id/verification')
  @ApiOperation({ summary: 'Toggle user verification status' })
  async toggleUserVerification(@Param('id') id: string) {
    return this.AdminService.toggleUserVerification(id);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change user role' })
  async changeUserRole(@Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.AdminService.changeUserRole(id, dto.role);
  }

  @Get('users/:id/activity')
  @ApiOperation({ summary: 'Get user OTP activity history' })
  async getUserActivity(@Param('id') id: string) {
    return this.AdminService.getUserActivity(id);
  }
}
