import { Global, Module } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';

@Global() // Để dùng được toàn app, không cần import nhiều lần
@Module({
  providers: [TenantPrismaService],
  exports: [TenantPrismaService],
})
export class PrismaModule {}
