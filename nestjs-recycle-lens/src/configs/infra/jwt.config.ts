import { registerAs } from '@nestjs/config';
import { EConfigKeys } from '../../common/types/config-keys';

const JwtConfig = registerAs(EConfigKeys.JWT, () => {
  return {
    secret: process.env.JWT_SECRET,
    refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
    audience: process.env.JWT_TOKEN_AUDIENCE,
    issuer: process.env.JWT_TOKEN_ISSUER,
    accessTokenTtl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '3600', 10),
    refreshTokenTtl: parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '86400', 10),
  };
});

export default JwtConfig;
