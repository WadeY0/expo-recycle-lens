import { Injectable, Scope } from '@nestjs/common';
import { TenantService } from 'src/common/services/tenant.service';
import { safeUserSelect } from 'src/identities/users/user-response';

@Injectable({ scope: Scope.REQUEST })
export class UserTenantService {
  constructor(private readonly tenantService: TenantService) {}

  async findUserById(userId: string) {
    const prisma = await this.tenantService.getPrismaClient();
    return prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });
  }
}
