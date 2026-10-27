export const PUBLIC_ROUTES: { path: string; method: string }[] = [
  { path: '/auth/sign-in', method: 'POST' },
  { path: '/auth/sign-up', method: 'POST' },
  { path: '/auth/verification', method: 'POST' },
  { path: '/auth/refresh-token', method: 'POST' },
  { path: '/public', method: 'GET' },
];
