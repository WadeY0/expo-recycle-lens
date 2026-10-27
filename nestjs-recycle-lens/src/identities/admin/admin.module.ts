import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TenantService } from 'src/common/services/tenant.service';

@Module({
  providers: [AdminService, TenantService],
  imports: [AuthModule, UsersModule],
  exports: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
