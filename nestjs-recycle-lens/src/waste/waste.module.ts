import { Module } from '@nestjs/common';
import { AuthModule } from 'src/identities/auth/auth.module';
import { TenantService } from 'src/common/services/tenant.service';
import { WasteController } from './waste.controller';
import { WasteService } from './waste.service';
@Module({
  imports: [AuthModule],
  controllers: [WasteController],
  providers: [WasteService, TenantService],
  exports: [WasteService],
})
export class WasteModule {}
