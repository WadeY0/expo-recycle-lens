import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import {
  assertTokenTenant,
  resolveTenant,
  TenantRequest,
} from './tenant-context';
import { getDatabaseUrl } from '../../configs/infra/app.config';
import { resolveSeedTarget } from '../../../prisma/seed';
import { JwtStrategy } from '../../identities/auth/strategy/jwt.strategy';
import { AuthService } from '../../identities/auth/providers/auth.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import environmentValidation from '../../configs/infra/environment.validation';

jest.mock('dotenv/config', () => ({}));
const keys = ['DATABASE_URL', 'DATABASE_URL_RECYCLELENS', 'DATABASE_URL_APP_B'];
const original = keys.map((key) => process.env[key]);
const request = (tenant?: unknown) =>
  ({
    headers: tenant === undefined ? {} : { 'x-tenant-id': tenant },
  }) as TenantRequest;
const jwtConfig = {
  secret: 'test-access-secret',
  refreshTokenSecret: 'test-refresh-secret',
  audience: 'test-audience',
  issuer: 'test-issuer',
};
const config = new ConfigService({ JWT: jwtConfig });

describe('database-per-tenant boundary', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://localhost/cli';
    process.env.DATABASE_URL_RECYCLELENS = 'postgresql://localhost/one';
    process.env.DATABASE_URL_APP_B = 'postgresql://localhost/two';
  });
  afterAll(() => {
    keys.forEach((key, index) => {
      if (original[index] === undefined) delete process.env[key];
      else process.env[key] = original[index];
    });
  });
  it('routes normalized/default tenants to independent bindings, not the CLI URL', () => {
    expect(resolveTenant(request('recyclelens'))).toEqual({
      tenantId: 'RECYCLELENS',
      databaseUrl: 'postgresql://localhost/one',
    });
    expect(resolveTenant(request('app_b'))).toEqual({
      tenantId: 'APP_B',
      databaseUrl: 'postgresql://localhost/two',
    });
    expect(resolveTenant(request()).tenantId).toBe('RECYCLELENS');
    expect(getDatabaseUrl()).toBe('postgresql://localhost/cli');
  });
  it('does not fall back to DATABASE_URL or another tenant for a missing binding', () => {
    delete process.env.DATABASE_URL_APP_B;
    expect(() => resolveTenant(request('APP_B'))).toThrow(
      UnauthorizedException,
    );
    delete process.env.DATABASE_URL_RECYCLELENS;
    expect(() => resolveTenant(request())).toThrow(UnauthorizedException);
    expect(() => resolveTenant(request('OTHER'))).toThrow(
      UnauthorizedException,
    );
  });
  it('validates dynamic runtime bindings independently from the optional CLI URL', () => {
    const variables = {
      FRONTEND_URL: 'http://localhost:8081',
      JWT_SECRET: 'unit-access',
      JWT_REFRESH_TOKEN_SECRET: 'unit-refresh',
      JWT_TOKEN_AUDIENCE: 'unit',
      JWT_TOKEN_ISSUER: 'unit',
      JWT_ACCESS_TOKEN_TTL: 3600,
      JWT_REFRESH_TOKEN_TTL: 86400,
      RESEND_API_KEY: 'unit',
      EMAIL_FROM: 'unit@example.invalid',
      EMAIL_HOST: 'localhost',
      EMAIL_PORT: 1,
      EMAIL_USERNAME: 'unit',
      EMAIL_PASSWORD: 'unit',
      GOOGLE_CLIENT_ID: 'unit',
      GOOGLE_CLIENT_SECRET: 'unit',
      GOOGLE_CALLBACK_URL: 'http://localhost/callback',
      DATABASE_URL: 'postgresql://localhost/cli',
      DATABASE_URL_RECYCLELENS: 'postgresql://localhost/one',
      DATABASE_URL_APP_B: 'postgresql://localhost/two',
    };
    expect(environmentValidation.validate(variables).error).toBeUndefined();
    expect(
      environmentValidation.validate({
        ...variables,
        DATABASE_URL: undefined,
        DATABASE_URL_RECYCLELENS: undefined,
      }).error,
    ).toBeUndefined();
    expect(
      environmentValidation.validate({
        ...variables,
        DATABASE_URL_APP_B: 'https://user:private@localhost/two',
      }).error?.message,
    ).not.toContain('private');
    expect(
      environmentValidation.validate({
        ...variables,
        DATABASE_URL_APP_B: 'https://localhost/two',
      }).error,
    ).toBeDefined();
    expect(
      environmentValidation.validate({
        ...variables,
        DATABASE_URL_RECYCLELENS: undefined,
        DATABASE_URL_APP_B: undefined,
      }).error,
    ).toBeDefined();
  });
  it.each(['', '../RECYCLELENS', 'postgres://localhost/test', ['RECYCLELENS']])(
    'rejects malformed tenant headers %s',
    (header) => {
      expect(() => resolveTenant(request(header))).toThrow(BadRequestException);
    },
  );
  it('rejects invalid bound URLs without leaking credentials or falling back', () => {
    process.env.DATABASE_URL_APP_B = 'https://user:private@localhost/two';
    expect(() => resolveTenant(request('APP_B'))).toThrow(
      'URL PostgreSQL hợp lệ',
    );
    expect(() => resolveTenant(request('APP_B'))).not.toThrow('private');
  });
  it('rejects cross-tenant and ambiguous legacy tokens', () => {
    expect(() => assertTokenTenant('APP_B', 'RECYCLELENS')).toThrow(
      UnauthorizedException,
    );
    expect(() => assertTokenTenant(undefined, 'RECYCLELENS')).toThrow(
      UnauthorizedException,
    );
    expect(() => assertTokenTenant('RECYCLELENS', 'RECYCLELENS')).not.toThrow();
  });
  it('seed selects exactly the CLI target or the requested binding and rejects bad arguments', () => {
    expect(resolveSeedTarget([])).toEqual({
      label: 'DATABASE_URL',
      url: 'postgresql://localhost/cli',
    });
    expect(resolveSeedTarget(['--tenant=app_b'])).toEqual({
      label: 'APP_B',
      url: 'postgresql://localhost/two',
    });
    delete process.env.DATABASE_URL_APP_B;
    expect(() => resolveSeedTarget(['--tenant=APP_B'])).toThrow(
      UnauthorizedException,
    );
    expect(() => resolveSeedTarget(['--tenant='])).toThrow(BadRequestException);
    expect(() =>
      resolveSeedTarget(['--tenant=APP_B', '--tenant=RECYCLELENS']),
    ).toThrow('Dùng npm run seed');
    delete process.env.DATABASE_URL;
    expect(() => resolveSeedTarget([])).toThrow('URL PostgreSQL hợp lệ');
  });
  it('JWT checks tenant before opening a pool and reads role/version from that binding', async () => {
    const pool = new TenantPrismaService();
    const user = {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'same@example.invalid',
      role: 'user',
      isVerified: true,
      tokenVersion: 2,
    };
    const findUnique = jest.fn().mockResolvedValue(user);
    const getClient = jest.spyOn(pool, 'getClient').mockResolvedValue({
      user: { findUnique },
    } as unknown as PrismaClient);
    const strategy = new JwtStrategy(config, pool);
    const payload = { sub: user.id, tenantId: 'RECYCLELENS', tokenVersion: 2 };
    await expect(strategy.validate(request('APP_B'), payload)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(getClient).not.toHaveBeenCalled();
    await expect(
      strategy.validate(request('APP_B'), { ...payload, tenantId: 'APP_B' }),
    ).resolves.toMatchObject({ role: 'user', tenantId: 'APP_B' });
    expect(getClient).toHaveBeenCalledWith('postgresql://localhost/two');
    await expect(
      strategy.validate(request('APP_B'), {
        ...payload,
        tenantId: 'APP_B',
        tokenVersion: 1,
      }),
    ).rejects.toThrow(UnauthorizedException);
    getClient.mockRestore();
  });
  it('a cryptographically valid refresh for A is rejected in B before querying B', async () => {
    const jwt = new JwtService();
    const refresh = await jwt.signAsync(
      { sub: 'user-a', tenantId: 'RECYCLELENS', tokenUse: 'refresh' },
      {
        secret: jwtConfig.refreshTokenSecret,
        audience: jwtConfig.audience,
        issuer: jwtConfig.issuer,
        expiresIn: '1h',
      },
    );
    const getTenantPrisma = jest.fn();
    const auth = {
      config,
      jwt,
      getTenantPrisma,
      tenantService: {
        getTenantId: () => resolveTenant(request('APP_B')).tenantId,
      },
    } as unknown as AuthService;
    await expect(
      AuthService.prototype.refreshToken.call(auth, refresh),
    ).rejects.toThrow(UnauthorizedException);
    expect(getTenantPrisma).not.toHaveBeenCalled();
  });
});
