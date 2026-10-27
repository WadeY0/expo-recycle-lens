import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
export interface AiAnalysis {
  result: unknown;
  conversationId: string | null;
  provider: string | null;
  model: string | null;
  totalTokens?: number | null;
}

function responseShape(data: unknown): string {
  if (data === undefined) return 'not_received';
  if (data === null) return 'null';
  if (Array.isArray(data)) return 'array';
  if (typeof data !== 'object') return typeof data;
  if (!Object.hasOwn(data, 'result')) return 'object_without_result';
  const result = (data as Record<string, unknown>).result;
  return `object_with_result_${Array.isArray(result) ? 'array' : result === null ? 'null' : typeof result}`;
}
@Injectable()
export class VisionAiService {
  private readonly logger = new Logger(VisionAiService.name);
  constructor(private readonly http: HttpService) {}
  async analyze(
    imageUrl: string,
    tenantId: string,
    conversationId?: string,
  ): Promise<AiAnalysis> {
    const domain = process.env.CHAT_DOMAIN?.trim();
    const sharedCode = process.env.CHATBOT_CODE?.trim();
    const greenlenCode = process.env.CHATBOT_CODE_GREENLEN?.trim();
    const chatbotCode =
      tenantId === 'GREENLEN'
        ? greenlenCode || sharedCode
        : sharedCode || greenlenCode;
    if (!domain || !chatbotCode)
      throw new ServiceUnavailableException('Vision AI is not configured');
    const form = new FormData();
    form.append('chatbotCode', chatbotCode);
    form.append('imageUrl', imageUrl);
    if (conversationId) form.append('conversationId', conversationId);
    // The provider owns the chatbot prompt. Preserve the pre-Phase-1 multipart
    // contract: no extra prompt field was sent by the historical client.
    const startedAt = Date.now();
    let stage = 'provider_request';
    let upstreamStatus: number | null = null;
    let responseStructure = 'not_received';
    try {
      const response = await firstValueFrom(
        this.http.post<unknown>(
          `${domain.replace(/\/$/, '')}/vision/analyze`,
          form,
          {
            headers: form.getHeaders(),
            timeout: 25000,
            maxContentLength: 100000,
            maxBodyLength: 100000,
          },
        ),
      );
      upstreamStatus = response.status;
      stage = 'response_envelope';
      const data = response.data;
      responseStructure = responseShape(data);
      if (
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data) ||
        !Object.hasOwn(data, 'result')
      )
        throw new Error('Invalid provider envelope');
      const info = data as Record<string, unknown>;
      if (info.result == null || info.error || info.success === false)
        throw new Error('Invalid provider result');
      const metadata = (value: unknown, max: number) =>
        typeof value === 'string' && value.trim() && value.length <= max
          ? value
          : null;
      return {
        result: info.result,
        conversationId: metadata(info.conversationId, 200),
        provider: metadata(info.provider, 80),
        model: metadata(info.model, 120),
        totalTokens:
          Number.isSafeInteger(info.totalTokens) &&
          (info.totalTokens as number) >= 0
            ? (info.totalTokens as number)
            : null,
      };
    } catch (error) {
      if (isAxiosError(error) && error.response)
        responseStructure = responseShape(error.response.data);
      // Never log Axios errors/config, chatbot code, image URL or raw provider data.
      this.logger.warn({
        event: 'vision_provider_failed',
        stage,
        upstreamStatus: isAxiosError(error)
          ? (error.response?.status ?? upstreamStatus)
          : upstreamStatus,
        requestContentType: 'multipart/form-data',
        responseStructure,
        durationMs: Date.now() - startedAt,
      });
      if (
        isAxiosError(error) &&
        ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')
      )
        throw new GatewayTimeoutException(
          'Phân tích ảnh quá thời gian. Vui lòng thử lại.',
        );
      throw new BadGatewayException(
        'Dịch vụ AI chưa thể phân tích ảnh. Vui lòng thử lại sau.',
      );
    }
  }
}
