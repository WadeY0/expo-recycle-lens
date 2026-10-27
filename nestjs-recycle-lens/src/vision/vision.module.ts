import { GamificationModule } from 'src/gamification/gamification.module';
import { ScanImageService } from './providers/scan-image.service';
import { ScanMediaService } from './providers/scan-media.service';
import { VisionAiService } from './providers/vision-ai.service';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VisionController } from './vision.controller';
import { VisionService } from './providers/vision.service';
import { TenantService } from 'src/common/services/tenant.service';
import { AuthModule } from 'src/identities/auth/auth.module';
import { ArticlesService } from 'src/articles/providers/articles.service';

@Module({
  imports: [AuthModule, HttpModule, GamificationModule],
  controllers: [VisionController],
  providers: [
    VisionService,
    TenantService,
    ArticlesService,
    ScanImageService,
    ScanMediaService,
    VisionAiService,
  ],
})
export class VisionModule {}
