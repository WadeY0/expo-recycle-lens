import { Module } from '@nestjs/common';
import { CategoriesService } from './providers/categories.service';
import { CategoriesController } from './categories.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { TenantService } from 'src/common/services/tenant.service';
import { AuthModule } from 'src/identities/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService, TenantService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
