import { Module } from '@nestjs/common';
import { AuthModule } from 'src/identities/auth/auth.module';
import { TenantService } from 'src/common/services/tenant.service';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
@Module({
  imports: [AuthModule],
  controllers: [GamificationController],
  providers: [TenantService, GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
