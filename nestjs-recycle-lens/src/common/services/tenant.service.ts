import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { resolveTenant, TenantRequest } from '../types/tenant-context';

@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  constructor(
    private readonly tenantPrismaService: TenantPrismaService,
    @Inject(REQUEST) private readonly request: TenantRequest,
  ) {}

  async getPrismaClient(): Promise<PrismaClient> {
    const { databaseUrl } = resolveTenant(this.request);
    return this.tenantPrismaService.getClient(databaseUrl);
  }

  getTenantId(): string {
    return resolveTenant(this.request).tenantId;
  }

  getDatabaseUrl(): string {
    return resolveTenant(this.request).databaseUrl;
  }
}
