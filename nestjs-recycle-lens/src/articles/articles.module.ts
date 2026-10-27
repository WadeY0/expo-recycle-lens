import { Module } from '@nestjs/common';
import { ArticlesService } from './providers/articles.service';
import { ArticlesController } from './articles.controller';
import { AdminArticlesController } from './admin-articles.controller';
import { TenantService } from 'src/common/services/tenant.service';
import { AuthModule } from 'src/identities/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ArticlesController, AdminArticlesController],
  providers: [ArticlesService, TenantService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
