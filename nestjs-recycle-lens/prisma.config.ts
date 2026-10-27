import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';
import { getDatabaseUrl } from './src/configs/infra/app.config';

dotenv.config();

export default defineConfig({
  migrations: {
    seed: 'ts-node -r tsconfig-paths/register prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL?.trim() ? getDatabaseUrl() : undefined,
  },
});
