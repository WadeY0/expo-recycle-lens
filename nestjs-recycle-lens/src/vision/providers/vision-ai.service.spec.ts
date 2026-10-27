import { HttpService } from '@nestjs/axios';
import axios, { AxiosError } from 'axios';
import { VisionAiService } from './vision-ai.service';
import { Logger } from '@nestjs/common';
import { normalizeProviderResult } from './vision-normalizer';
import { eligibleScanResult } from 'src/gamification/scan-eligibility';
import { Prisma, PrismaClient } from '@prisma/client';
import { VisionService } from './vision.service';
import { TenantService } from 'src/common/services/tenant.service';
import { ScanImageService } from './scan-image.service';
import { ScanMediaService } from './scan-media.service';
import { GamificationService } from 'src/gamification/gamification.service';
import { visionResultFields } from '../vision-response';
describe('external AI contract', () => {
  let warn: jest.SpyInstance;
  const original = {
    domain: process.env.CHAT_DOMAIN,
    code: process.env.CHATBOT_CODE,
    legacy: process.env.CHATBOT_CODE_GREENLEN,
  };
  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    process.env.CHAT_DOMAIN = 'https://vision.example.invalid';
    process.env.CHATBOT_CODE = 'fixture-chatbot-code';
    delete process.env.CHATBOT_CODE_GREENLEN;
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(() => {
    if (original.domain === undefined) delete process.env.CHAT_DOMAIN;
    else process.env.CHAT_DOMAIN = original.domain;
    if (original.code === undefined) delete process.env.CHATBOT_CODE;
    else process.env.CHATBOT_CODE = original.code;
    if (original.legacy === undefined) delete process.env.CHATBOT_CODE_GREENLEN;
    else process.env.CHATBOT_CODE_GREENLEN = original.legacy;
  });
  it('uses existing multipart endpoint with timeout and safely validates envelope', async () => {
    const transport = axios.create({
      adapter: (config) => {
        expect(config.url).toBe(
          'https://vision.example.invalid/vision/analyze',
        );
        expect(config.timeout).toBe(25000);
        expect(config.method).toBe('post');
        expect(config.headers.get('Content-Type')).toMatch(
          /^multipart\/form-data; boundary=/,
        );
        const body = (config.data as { getBuffer(): Buffer })
          .getBuffer()
          .toString();
        expect(body).toContain('fixture-chatbot-code');
        expect(body).toContain('https://images.example.invalid/a.jpg');
        expect(config.headers.get('Authorization')).toBeUndefined();
        expect(
          [...body.matchAll(/name="([^"]+)"/g)].map((part) => part[1]),
        ).toEqual(['chatbotCode', 'imageUrl']);
        return Promise.resolve({
          data: {
            result: '{"wasteClass":"pet-bottle"}',
            provider: 'test',
            model: 'fixture',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
      },
    });
    const service = new VisionAiService(new HttpService(transport));
    expect(
      await service.analyze(
        'https://images.example.invalid/a.jpg',
        'RECYCLELENS',
      ),
    ).toEqual({
      result: '{"wasteClass":"pet-bottle"}',
      conversationId: null,
      provider: 'test',
      model: 'fixture',
      totalTokens: null,
    });
  });
  it.each([
    { title: 'Chai nhựa PET', content: '<p>Never use AI disposal HTML.</p>' },
    { title: 'Một vật chưa xác định', content: '<p>Unknown item.</p>' },
    { title: 'Pin', content: '<p>Unsafe legacy disposal advice.</p>' },
    {
      title: 'Chai nhựa PET',
      content: '<p>Cần kiểm tra vật liệu.</p>',
      uncertain: true,
    },
  ])(
    'accepts the legacy envelope and preserves standalone HTML for %j',
    async (result) => {
      const transport = axios.create({
        adapter: (config) => {
          const body = (config.data as { getBuffer(): Buffer })
            .getBuffer()
            .toString();
          expect(
            [...body.matchAll(/name="([^"]+)"/g)].map((part) => part[1]),
          ).toEqual(['chatbotCode', 'imageUrl', 'conversationId']);
          expect(body).toContain('existing-conversation');
          return Promise.resolve({
            data: {
              result: JSON.stringify(result),
              conversationId: 'next-conversation',
              provider: 'fixture',
              model: 'fixture',
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          });
        },
      });
      const analysis = await new VisionAiService(
        new HttpService(transport),
      ).analyze(
        'https://images.example.invalid/a.jpg',
        'APP_B',
        'existing-conversation',
      );
      expect(analysis.conversationId).toBe('next-conversation');
      const normalized = normalizeProviderResult(analysis.result);
      expect(normalized.status).toBe(
        'uncertain' in result
          ? 'uncertain'
          : result.title === 'Pin'
            ? 'hazardous'
            : result.title === 'Chai nhựa PET'
              ? 'recognized'
              : 'unknown',
      );
      expect(normalized.modelReportedConfidence).toBeNull();
      expect(normalized.content).toBe(result.content);
      expect(normalized.matchedWaste).toBeNull();
      if (
        normalized.status === 'unknown' ||
        normalized.status === 'uncertain'
      ) {
        expect(normalized.guidance).toBeNull();
        expect(
          eligibleScanResult(
            JSON.parse(JSON.stringify(normalized)) as Prisma.JsonValue,
            normalized.matchedWaste?.slug ?? null,
          ),
        ).toBe(false);
      }
      if (normalized.status === 'hazardous')
        expect(normalized.guidance).toBeNull();
    },
  );
  it.each([
    { data: { result: '{"label":"PET"}' } },
    { title: 'PET', content: 'not an envelope' },
    { result: null },
    { result: '{"label":"PET"}', success: false },
    { result: '{"label":"PET"}', error: 'sensitive provider body' },
  ])(
    'rejects missing/failed envelopes rather than guessing a response contract',
    async (data) => {
      const service = new VisionAiService(
        new HttpService(
          axios.create({
            adapter: (config) =>
              Promise.resolve({
                data,
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
              }),
          }),
        ),
      );
      await expect(
        service.analyze('https://images.example.invalid/a.jpg', 'RECYCLELENS'),
      ).rejects.toThrow('Dịch vụ AI');
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'response_envelope',
          upstreamStatus: 200,
          requestContentType: 'multipart/form-data',
        }),
      );
      const diagnostics = JSON.stringify(warn.mock.calls);
      expect(diagnostics).not.toContain('sensitive provider body');
      expect(diagnostics).not.toContain('fixture-chatbot-code');
      expect(diagnostics).not.toContain('images.example.invalid');
    },
  );
  it('retains timeout failure and sanitized provider-request diagnostics', async () => {
    const service = new VisionAiService(
      new HttpService(
        axios.create({
          adapter: () =>
            Promise.reject(
              new AxiosError('sensitive upstream payload', 'ECONNABORTED'),
            ),
        }),
      ),
    );
    await expect(
      service.analyze('https://images.example.invalid/a.jpg', 'RECYCLELENS'),
    ).rejects.toThrow('quá thời gian');
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'provider_request',
        upstreamStatus: null,
      }),
    );
  });
  it('uses the existing GREENLEN code only when the shared code is absent', async () => {
    delete process.env.CHATBOT_CODE;
    process.env.CHATBOT_CODE_GREENLEN = 'legacy-code-fixture';
    const service = new VisionAiService(
      new HttpService(
        axios.create({
          adapter: (config) => {
            expect(
              (config.data as { getBuffer(): Buffer }).getBuffer().toString(),
            ).toContain('legacy-code-fixture');
            return Promise.resolve({
              data: { result: '{"title":"PET","content":"legacy"}' },
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
            });
          },
        }),
      ),
    );
    await expect(
      service.analyze('https://images.example.invalid/a.jpg', 'RECYCLELENS'),
    ).resolves.toHaveProperty('result');
  });
  it('prefers the configured GREENLEN chatbot for the GREENLEN tenant', async () => {
    process.env.CHATBOT_CODE_GREENLEN = 'greenlen-tenant-fixture';
    const service = new VisionAiService(
      new HttpService(
        axios.create({
          adapter: (config) => {
            const body = (config.data as { getBuffer(): Buffer })
              .getBuffer()
              .toString();
            expect(body).toContain('greenlen-tenant-fixture');
            expect(body).not.toContain('fixture-chatbot-code');
            return Promise.resolve({
              data: {
                result: '{"title":"PET","content":"<p>Provider</p>"}',
                totalTokens: 123,
              },
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
            });
          },
        }),
      ),
    );
    expect(
      await service.analyze('https://images.example.invalid/a.jpg', 'GREENLEN'),
    ).toHaveProperty('totalTokens', 123);
  });
  it('does not expose provider response or tokens in errors', async () => {
    const service = new VisionAiService(
      new HttpService(
        axios.create({
          adapter: (config) =>
            Promise.reject(
              new AxiosError(
                'sensitive upstream payload',
                'ERR_BAD_REQUEST',
                config,
                undefined,
                {
                  status: 400,
                  statusText: 'Bad Request',
                  headers: {},
                  config,
                  data: { error: 'sensitive upstream payload' },
                },
              ),
            ),
        }),
      ),
    );
    await expect(
      service.analyze('https://images.example.invalid/a.jpg', 'RECYCLELENS'),
    ).rejects.toThrow('Dịch vụ AI');
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        upstreamStatus: 400,
        stage: 'provider_request',
        responseStructure: 'object_without_result',
      }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain(
      'sensitive upstream payload',
    );
  });
  it('fails explicitly if provider configuration is missing', async () => {
    delete process.env.CHAT_DOMAIN;
    const service = new VisionAiService(new HttpService());
    await expect(
      service.analyze('https://images.example.invalid/a.jpg', 'RECYCLELENS'),
    ).rejects.toThrow('not configured');
    process.env.CHAT_DOMAIN = 'https://vision.example.invalid';
    delete process.env.CHATBOT_CODE;
    await expect(
      service.analyze('https://images.example.invalid/a.jpg', 'RECYCLELENS'),
    ).rejects.toThrow('not configured');
  });
});

describe('AI-first persistence boundary (mock database, not PostgreSQL e2e)', () => {
  function setup(libraryFails = false) {
    let stored: Prisma.ArticleGetPayload<{
      include: { scanAnalysis: true };
    }> | null = null;
    const create = jest.fn(
      (input: {
        data: {
          title: string;
          content: string;
          scanAnalysis: {
            create: { result: Prisma.InputJsonValue; wasteSlug?: string };
          };
        };
      }) => {
        stored = {
          id: 'persisted-scan',
          title: input.data.title,
          content: input.data.content,
          image: 'https://images.example.invalid/a.jpg',
          createdAt: new Date(),
          createdById: 'owner',
          type: 'ai_scan',
          scanAnalysis: {
            result: input.data.scanAnalysis.create.result,
            provider: 'fixture',
            model: null,
          },
        } as unknown as NonNullable<typeof stored>;
        return Promise.resolve(stored);
      },
    );
    const tx = {
      article: { findFirst: jest.fn(() => Promise.resolve(stored)), create },
      conversation: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn((work: (client: typeof tx) => unknown) => work(tx)),
    };
    const tenants = {
      getPrismaClient: () => Promise.resolve(prisma as unknown as PrismaClient),
      getTenantId: () => 'RECYCLELENS',
    };
    const waste = {
      matchingCatalog: libraryFails
        ? jest.fn().mockRejectedValue(new Error('no library'))
        : jest.fn().mockResolvedValue([]),
    };
    const media = {
      upload: jest.fn().mockResolvedValue({
        url: 'https://images.example.invalid/a.jpg',
        publicId: 'uploaded',
      }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const ai = {
      analyze: jest.fn().mockResolvedValue({
        result: {
          title: 'Hộp cà phê',
          content: '<p>AI thấy một hộp hai lớp.</p>',
        },
        conversationId: null,
        provider: 'fixture',
        model: null,
      }),
    };
    const gamification = {
      lockUser: jest.fn().mockResolvedValue(undefined),
      processScan: jest.fn().mockResolvedValue(undefined),
    };
    const service = new VisionService(
      tenants as unknown as TenantService,
      {
        normalize: () => Promise.resolve(Buffer.from('validated image')),
      } as ScanImageService,
      media as unknown as ScanMediaService,
      ai as unknown as VisionAiService,
      gamification as unknown as GamificationService,
    );
    return { service, create, ai, media, gamification, waste, prisma };
  }
  it.each([false, true])(
    'saves actual HTML without consulting library unavailable=%s and reuses the persisted scan on retry',
    async (libraryFails) => {
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      try {
        const { service, create, ai, gamification, waste } =
          setup(libraryFails);
        const result = await service.analyzeAndSave(
          undefined,
          'owner',
          'stable_request_key',
        );
        expect(result.id).toBe('persisted-scan');
        expect(result.id).toBe(result.article.id);
        expect(result.article.title).toBe('Hộp cà phê');
        expect(result.analysis).toMatchObject({
          status: 'recognized',
          label: 'Hộp cà phê',
          content: '<p>AI thấy một hộp hai lớp.</p>',
          source: 'third_party_vision',
          contentFormat: 'html',
          matchedWaste: null,
          libraryMatchStatus: 'not_requested',
        });
        expect(waste.matchingCatalog).not.toHaveBeenCalled();
        expect(result.article.content).toBe('<p>AI thấy một hộp hai lớp.</p>');
        expect(visionResultFields(result.article).analysis).toEqual(
          result.analysis,
        );
        const retry = await service.analyzeAndSave(
          undefined,
          'owner',
          'stable_request_key',
        );
        expect(retry.id).toBe(result.id);
        expect(create).toHaveBeenCalledTimes(1);
        expect(ai.analyze).toHaveBeenCalledTimes(1);
        expect(gamification.processScan).toHaveBeenCalledTimes(1);
      } finally {
        warn.mockRestore();
      }
    },
  );
  it('a simulated provider failure writes no success and compensates the uploaded image', async () => {
    const { service, create, ai, media } = setup();
    ai.analyze.mockRejectedValueOnce(new Error('provider failed'));
    await expect(service.analyzeAndSave(undefined, 'owner')).rejects.toThrow(
      'provider failed',
    );
    expect(create).not.toHaveBeenCalled();
    expect(media.remove).toHaveBeenCalledWith('uploaded');
  });
  it('invalid provider HTML creates no scan or rewards and compensates the upload', async () => {
    const { service, create, ai, media, gamification } = setup();
    ai.analyze.mockResolvedValueOnce({
      result: { title: 'PET', content: '<script>fake()</script>' },
      conversationId: null,
      provider: 'fixture',
      model: null,
    });
    await expect(service.analyzeAndSave(undefined, 'owner')).rejects.toThrow(
      'nội dung phân tích',
    );
    expect(create).not.toHaveBeenCalled();
    expect(gamification.processScan).not.toHaveBeenCalled();
    expect(media.remove).toHaveBeenCalledWith('uploaded');
  });
});
