import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EConfigKeys } from 'src/common/types/config-keys';
import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  assertTokenTenant,
  resolveTenant,
  TenantRequest,
} from 'src/common/types/tenant-context';

export interface JwtPayload {
  sub: string;
  tenantId?: string;
  tokenVersion?: number;
  tokenUse?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly tenants: TenantPrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>(`${EConfigKeys.JWT}.secret`),
      audience: config.getOrThrow<string>(`${EConfigKeys.JWT}.audience`),
      issuer: config.getOrThrow<string>(`${EConfigKeys.JWT}.issuer`),
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  async validate(request: TenantRequest, payload: JwtPayload) {
    const { tenantId, databaseUrl } = resolveTenant(request);
    assertTokenTenant(payload.tenantId, tenantId);
    if (payload.tokenUse && payload.tokenUse !== 'access')
      throw new UnauthorizedException();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        payload.sub ?? '',
      )
    ) {
      throw new UnauthorizedException();
    }
    const prisma = await this.tenants.getClient(databaseUrl);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        tokenVersion: true,
      },
    });
    if (
      !user?.isVerified ||
      user.tokenVersion !== (payload.tokenVersion ?? 0)
    ) {
      throw new UnauthorizedException();
    }
    // Role is read from the current tenant database, not a stale token claim.
    return { id: user.id, email: user.email, role: user.role, tenantId };
  }
}
