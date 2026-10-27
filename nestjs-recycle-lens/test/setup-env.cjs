// Test-only configuration. Refuse to operate against an application database.
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'Set TEST_DATABASE_URL to an isolated local recycle_foundation_test database',
  );
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
  parsed.pathname !== '/recycle_foundation_test'
) {
  throw new Error(
    'E2E tests require the isolated local recycle_foundation_test database',
  );
}
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: url,
  DATABASE_URL_RECYCLELENS: url,
  JWT_SECRET: 'foundation-test-access-only',
  JWT_REFRESH_TOKEN_SECRET: 'foundation-test-refresh-only',
  JWT_TOKEN_AUDIENCE: 'foundation-test',
  JWT_TOKEN_ISSUER: 'foundation-test',
  JWT_ACCESS_TOKEN_TTL: '3600',
  JWT_REFRESH_TOKEN_TTL: '86400',
  FRONTEND_URL: 'http://localhost:8081',
  RESEND_API_KEY: 'test-stub-no-delivery',
  EMAIL_FROM: 'test@example.invalid',
  EMAIL_HOST: '127.0.0.1',
  EMAIL_PORT: '1',
  EMAIL_USERNAME: 'test',
  EMAIL_PASSWORD: 'test',
  GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_CLIENT_SECRET: 'test-stub',
  GOOGLE_CALLBACK_URL: 'http://localhost/callback',
  BASE_URL: 'https://images.example.invalid/image/upload',
});
