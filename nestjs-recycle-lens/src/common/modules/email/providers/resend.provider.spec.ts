import { ResendProvider, EMAIL_TIMEOUT_MS } from './resend.provider';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
describe('Resend boundary reliability and redaction', () => {
  let provider: ResendProvider;
  const priorKey = process.env.RESEND_API_KEY,
    priorFrom = process.env.EMAIL_FROM;
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'unit-test-only';
    process.env.EMAIL_FROM = 'test@example.invalid';
    provider = new ResendProvider();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (priorKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = priorKey;
    if (priorFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = priorFrom;
  });
  it('uses authenticated provider payload and a bounded request, returning only a receipt', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'receipt', unwanted: 'ignored' }), {
        status: 200,
      }),
    );
    expect(
      await provider.sendOtp('recipient@example.invalid', '123456'),
    ).toEqual({ id: 'receipt' });
    expect(timeout).toHaveBeenCalledWith(EMAIL_TIMEOUT_MS);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options?.headers).toMatchObject({
      Authorization: 'Bearer unit-test-only',
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options?.body as string) as object).toMatchObject({
      to: 'recipient@example.invalid',
      from: 'test@example.invalid',
    });
  });
  it.each([401, 429, 500])(
    'maps provider %i to a safe 503 without consuming/logging its body',
    async (status) => {
      const response = new Response('sensitive-provider-body', { status });
      const read = jest.spyOn(response, 'text');
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      jest.spyOn(global, 'fetch').mockResolvedValue(response);
      await expect(
        provider.sendOtp('recipient@example.invalid', '123456'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(read).not.toHaveBeenCalled();
      expect(JSON.stringify(warn.mock.calls)).not.toMatch(
        /123456|recipient|unit-test-only|sensitive-provider-body/,
      );
    },
  );
  it.each([
    new Error('secret-placeholder'),
    new DOMException('Timed out', 'TimeoutError'),
  ])('handles network/timeout safely', async (error) => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(global, 'fetch').mockRejectedValue(error);
    await expect(
      provider.sendOtp('recipient@example.invalid', '123456'),
    ).rejects.toThrow('Không gửi được email');
  });
  it('rejects malformed success receipts', async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));
    await expect(
      provider.sendOtp('recipient@example.invalid', '123456'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('fails closed when configuration is absent without contacting a provider', async () => {
    delete process.env.RESEND_API_KEY;
    provider = new ResendProvider();
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(
      provider.sendOtp('recipient@example.invalid', '123456'),
    ).rejects.toThrow('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
