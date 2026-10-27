import { TenantPrismaService } from './tenant-prisma.service';
import { PrismaClient } from '@prisma/client';
const mockConnect = jest.fn<Promise<void>, []>();
const mockDisconnect = jest
  .fn<Promise<void>, []>()
  .mockResolvedValue(undefined);
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: mockConnect,
    $disconnect: mockDisconnect,
  })),
}));
jest.mock('@prisma/adapter-pg', () => ({ PrismaPg: jest.fn() }));
describe('Tenant client pool lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockReset();
    mockDisconnect.mockResolvedValue(undefined);
  });
  it('initializes one client for 20 simultaneous first-use requests and closes it once', async () => {
    let release!: () => void;
    mockConnect.mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const service = new TenantPrismaService();
    const pending = Array.from({ length: 20 }, () =>
      service.getClient('postgresql://localhost/test'),
    );
    expect(PrismaClient).toHaveBeenCalledTimes(1);
    release();
    const clients = await Promise.all(pending);
    expect(new Set(clients).size).toBe(1);
    await service.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
  it('removes a failed initialization, disposes its pool and safely retries', async () => {
    mockConnect
      .mockRejectedValueOnce(new Error('Driver contains secret-placeholder'))
      .mockResolvedValue(undefined);
    const service = new TenantPrismaService();
    await expect(
      service.getClient('postgresql://localhost/test'),
    ).rejects.toThrow('Tenant database connection unavailable');
    await service.getClient('postgresql://localhost/test');
    expect(PrismaClient).toHaveBeenCalledTimes(2);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    await service.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(2);
  });
  it('does not mix distinct configured tenant databases', async () => {
    mockConnect.mockResolvedValue(undefined);
    const service = new TenantPrismaService();
    const [a, b] = await Promise.all([
      service.getClient('postgresql://localhost/one'),
      service.getClient('postgresql://localhost/two'),
    ]);
    expect(a).not.toBe(b);
    await service.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(2);
  });
  it.each(['not-a-url', 'https://username:private@example.invalid/db'])(
    'rejects invalid database protocol without exposing the input %s',
    (url) => {
      const service = new TenantPrismaService();
      expect(() => service.getClient(url)).toThrow(
        'Invalid tenant database configuration',
      );
      expect(PrismaClient).not.toHaveBeenCalled();
    },
  );
});
