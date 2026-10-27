import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { refreshTokenDto } from './refresh-token.dto';

describe('refresh contract', () => {
  it.each([{ refreshToken: 'canonical' }, { refresh_token: 'legacy' }])(
    'accepts supported client field names',
    async (body) => {
      const dto = plainToInstance(refreshTokenDto, body);
      expect(await validate(dto, { whitelist: true })).toHaveLength(0);
      expect(dto.refreshToken).toBe(
        'refreshToken' in body ? body.refreshToken : body.refresh_token,
      );
    },
  );
  it('rejects missing token', async () =>
    expect(
      await validate(plainToInstance(refreshTokenDto, {})),
    ).not.toHaveLength(0));
});
