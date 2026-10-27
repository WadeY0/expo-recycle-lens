import { GamificationModule } from './gamification/gamification.module';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigAppModule } from './configs/config-app.module';
import { AuthModule } from './identities/auth/auth.module';
import { UsersModule } from './identities/users/users.module';
import { AdminModule } from './identities/admin/admin.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { CategoriesModule } from './categories/categories.module';
import { ArticlesModule } from './articles/articles.module';
import { WasteModule } from './waste/waste.module';
import { VisionModule } from './vision/vision.module';

@Module({
  imports: [
    PrismaModule,
    ConfigAppModule,
    AuthModule,
    UsersModule,
    AdminModule,
    CloudinaryModule,
    CategoriesModule,
    ArticlesModule,
    VisionModule,
    WasteModule,
    GamificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
