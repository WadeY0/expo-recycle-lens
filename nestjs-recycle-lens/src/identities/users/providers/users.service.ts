import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { User } from '@prisma/client';
import { TenantService } from 'src/common/services/tenant.service';
import { HashingProvider } from 'src/identities/auth/providers/hashing.provider';
import { CreateUserDto } from '../dto/create-user.dto';
import { EditUserDto } from '../dto/edit-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { safeUserSelect, userResponse } from '../user-response';

@Injectable()
export class UsersService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly hashingProvider: HashingProvider,
  ) {}

  private getTenantPrisma() {
    return this.tenantService.getPrismaClient();
  }

  // Internal password comparison only. Never returned by a controller.
  async findOneByEmailWithPassword(email: string): Promise<User> {
    const prisma = await this.getTenantPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');
    return user;
  }

  async findOneById(id: string) {
    if (!isUUID(id)) throw new BadRequestException('Invalid user ID format');
    const prisma = await this.getTenantPrisma();
    const user = await prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) throw new ForbiddenException('User not found');
    return userResponse(user);
  }

  async findOneByEmail(email: string) {
    const prisma = await this.getTenantPrisma();
    const user = await prisma.user.findUnique({
      where: { email },
      select: safeUserSelect,
    });
    if (!user) throw new ForbiddenException('User not found');
    return userResponse(user);
  }

  async createUser(dto: CreateUserDto, verified = false) {
    const prisma = await this.getTenantPrisma();
    if (await prisma.user.findUnique({ where: { email: dto.email } }))
      throw new ForbiddenException('User already exists');
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        password: await this.hashingProvider.hashPassword(dto.password),
        isVerified: verified,
        age: 'age' in dto && typeof dto.age === 'number' ? dto.age : null,
        role: 'user',
      },
      select: safeUserSelect,
    });
    return userResponse(user);
  }

  createUserWithoutOtp(dto: CreateUserDto) {
    return this.createUser(dto, true);
  }

  async editUser(id: string, dto: EditUserDto) {
    const prisma = await this.getTenantPrisma();
    return userResponse(
      await prisma.user.update({
        where: { id },
        data: { fullName: dto.fullName, age: dto.age },
        select: safeUserSelect,
      }),
    );
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const prisma = await this.getTenantPrisma();
    const user = await prisma.user.findUnique({ where: { id } });
    if (
      !user ||
      !(await this.hashingProvider.comparePassword(
        dto.oldPassword,
        user.password,
      ))
    )
      throw new ForbiddenException('Old password is incorrect');
    await prisma.user.update({
      where: { id },
      data: {
        password: await this.hashingProvider.hashPassword(dto.newPassword),
        tokenVersion: { increment: 1 },
      },
    });
    return { message: 'Password changed successfully; please sign in again' };
  }

  async uploadAvatar(id: string, file: Express.Multer.File) {
    if (!file?.path) throw new BadRequestException('File is required');
    const prisma = await this.getTenantPrisma();
    return userResponse(
      await prisma.user.update({
        where: { id },
        data: { avatar: file.path },
        select: safeUserSelect,
      }),
    );
  }
}
