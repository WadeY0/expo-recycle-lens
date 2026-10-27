import { registerAs } from '@nestjs/config';
import { EConfigKeys } from '../../common/types/config-keys';

export function validateDatabaseUrl(databaseUrl: string | undefined): string {
  try {
    const url = new URL(databaseUrl ?? '');
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !url.pathname.slice(1)
    )
      throw new Error();
  } catch {
    throw new Error(
      'Cần cấu hình URL PostgreSQL hợp lệ, có host và tên database.',
    );
  }
  return databaseUrl!;
}

// Prisma CLI and seed without --tenant use only the operator-selected DATABASE_URL.
// Runtime requests always use an explicit DATABASE_URL_<TENANT_ID> binding.
export function getDatabaseUrl(): string {
  return validateDatabaseUrl(process.env.DATABASE_URL?.trim());
}

const AppConfig = registerAs(EConfigKeys.AppConfig, () => ({
  Environment: process.env.NODE_ENV || 'development',
  FrontendUrl: process.env.FRONTEND_URL,
}));

export default AppConfig;
