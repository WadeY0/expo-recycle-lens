import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class TenantPrismaService {
  private clients = new Map<string, Promise<PrismaClient>>();

  getClient(databaseUrl: string): Promise<PrismaClient> {
    let url: URL;
    try {
      url = new URL(databaseUrl);
    } catch {
      throw new Error('Invalid tenant database configuration');
    }
    if (!['postgres:', 'postgresql:'].includes(url.protocol))
      throw new Error('Invalid tenant database configuration');
    const existing = this.clients.get(databaseUrl);
    if (existing) return existing;
    // Cache the in-flight connection, not only its eventual client: one pool per binding.
    const initializing = this.connect(databaseUrl);
    this.clients.set(databaseUrl, initializing);
    void initializing.catch(() => {
      if (this.clients.get(databaseUrl) === initializing)
        this.clients.delete(databaseUrl);
    });
    return initializing;
  }
  private async connect(databaseUrl: string) {
    let client: PrismaClient | undefined;
    try {
      client = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: databaseUrl,
          connectionTimeoutMillis: 10000,
          max: 10,
        }),
      });
      await client.$connect();
      return client;
    } catch {
      await client?.$disconnect().catch(() => undefined);
      // Driver errors may contain credentials/connection strings. Do not propagate them.
      throw new Error('Tenant database connection unavailable');
    }
  }
  async onModuleDestroy() {
    const clients = await Promise.allSettled(this.clients.values());
    await Promise.all(
      clients
        .filter(
          (result): result is PromiseFulfilledResult<PrismaClient> =>
            result.status === 'fulfilled',
        )
        .map((result) => result.value.$disconnect()),
    );
    this.clients.clear();
  }
}
