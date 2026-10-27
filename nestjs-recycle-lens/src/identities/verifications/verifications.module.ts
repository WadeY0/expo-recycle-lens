import { Module } from '@nestjs/common';
import { VerificationsService } from './providers/verifications.service';
import { VerificationsController } from './verifications.controller';
import { EmailModule } from 'src/common/modules/email/email.module';
import { TenantService } from 'src/common/services/tenant.service';

@Module({
  controllers: [VerificationsController],
  providers: [VerificationsService, TenantService],
  exports: [VerificationsService],
  imports: [EmailModule],
})
export class VerificationsModule {}
