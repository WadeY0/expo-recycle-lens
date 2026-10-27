import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { validateDatabaseUrl } from '../../configs/infra/app.config';

export interface TenantRequest extends Request {
  databaseUrl?: string;
  tenantId?: string;
}

export function normalizeTenantId(raw: unknown): string {
  if (typeof raw !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(raw))
    throw new BadRequestException('Invalid tenant');
  return raw.toUpperCase();
}

export function getTenantDatabaseUrl(tenant: unknown): string {
  const tenantId = normalizeTenantId(tenant);
  const binding = process.env[`DATABASE_URL_${tenantId}`]?.trim();
  if (!binding) throw new UnauthorizedException('Unsupported tenant');
  return validateDatabaseUrl(binding);
}

export function resolveTenant(request: TenantRequest) {
  const tenantId = normalizeTenantId(
    request.headers['x-tenant-id'] ?? 'RECYCLELENS',
  );
  const databaseUrl = getTenantDatabaseUrl(tenantId);
  request.tenantId = tenantId;
  request.databaseUrl = databaseUrl;
  return { tenantId, databaseUrl };
}

export function assertTokenTenant(tokenTenant: unknown, tenantId: string) {
  // Tokens without a tenant are ambiguous and must sign in again.
  if (typeof tokenTenant !== 'string' || tokenTenant.toUpperCase() !== tenantId)
    throw new UnauthorizedException(
      'Session tenant mismatch; please sign in again',
    );
}
