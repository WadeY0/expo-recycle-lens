export interface JwtConfig {
  secret: string;
  refreshTokenSecret: string;
  audience: string;
  issuer: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
}
