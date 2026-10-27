import { SafeUser, userResponse } from './user-response';

describe('safe user serialization', () => {
  const fixture = {
    id: 'user',
    email: 'user@example.invalid',
    fullName: 'User',
    avatar: 'https://google.example/avatar',
    role: 'user',
    age: null,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    password: 'hash-must-never-leak',
    tokenVersion: 3,
  };
  it('explicitly drops password and internal version even if a raw record reaches it', () => {
    const result = userResponse(fixture as SafeUser);
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('tokenVersion');
  });
  it('preserves absolute OAuth avatar URLs', () =>
    expect(userResponse(fixture).avatar).toBe(fixture.avatar));
});
