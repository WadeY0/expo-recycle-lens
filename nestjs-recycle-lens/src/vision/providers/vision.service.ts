import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ArticleType, ContentStatus, ConversationType } from '@prisma/client';
import { GamificationService } from 'src/gamification/gamification.service';
import { TenantService } from 'src/common/services/tenant.service';
import { toJson } from 'src/waste/json';
import { ScanImageService } from './scan-image.service';
import { ScanMediaService } from './scan-media.service';
import { VisionAiService } from './vision-ai.service';
import { normalizeProviderResult } from './vision-normalizer';
import { visionResultFields } from '../vision-response';

@Injectable()
export class VisionService {
  constructor(
    private readonly tenants: TenantService,
    private readonly images: ScanImageService,
    private readonly media: ScanMediaService,
    private readonly ai: VisionAiService,
    private readonly gamification: GamificationService,
  ) {}
  async analyzeAndSave(
    file: Express.Multer.File | undefined,
    userId: string,
    requestKey?: string,
  ) {
    if (requestKey !== undefined && !/^[A-Za-z0-9_-]{8,100}$/.test(requestKey))
      throw new BadRequestException('Invalid Idempotency-Key');
    const buffer = await this.images.normalize(file);
    const prisma = await this.tenants.getPrismaClient();
    const findPrevious = () =>
      requestKey
        ? prisma.article.findFirst({
            where: {
              createdById: userId,
              type: 'ai_scan',
              scanAnalysis: { requestUserId: userId, requestKey },
            },
            include: { scanAnalysis: true },
          })
        : null;
    const previous = await findPrevious();
    if (previous?.deletedAt)
      throw new ConflictException('Scan for this key is no longer available');
    if (previous?.scanAnalysis) return this.response(previous);
    const conversation = await prisma.conversation.findUnique({
      where: { userId_type: { userId, type: ConversationType.vision } },
    });
    const media = await this.media.upload(buffer);
    try {
      const ai = await this.ai.analyze(
        media.url,
        this.tenants.getTenantId(),
        conversation?.conversationId,
      );
      const normalized = normalizeProviderResult(ai.result);
      const outcome = await prisma.$transaction(
        async (tx) => {
          await this.gamification.lockUser(tx, userId);
          if (requestKey) {
            const saved = await tx.article.findFirst({
              where: {
                createdById: userId,
                type: 'ai_scan',
                scanAnalysis: { requestUserId: userId, requestKey },
              },
              include: { scanAnalysis: true },
            });
            if (saved?.deletedAt)
              throw new ConflictException(
                'Scan for this key is no longer available',
              );
            if (saved) return { article: saved, reused: true };
          }
          // A provider may reuse IDs across sessions; never attach another user's context.
          if (ai.conversationId) {
            const owner = await tx.conversation.findUnique({
              where: { conversationId: ai.conversationId },
            });
            if (
              !owner ||
              (owner.userId === userId &&
                owner.type === ConversationType.vision)
            )
              await tx.conversation.upsert({
                where: {
                  userId_type: { userId, type: ConversationType.vision },
                },
                create: {
                  userId,
                  type: ConversationType.vision,
                  conversationId: ai.conversationId,
                },
                update: { conversationId: ai.conversationId },
              });
          }
          const article = await tx.article.create({
            data: {
              title: normalized.label,
              content: normalized.content,
              image: media.url,
              status: ContentStatus.inactive,
              type: ArticleType.ai_scan,
              createdById: userId,
              scanAnalysis: {
                create: {
                  requestKey,
                  requestUserId: userId,
                  result: toJson({
                    ...normalized,
                    providerMetadata: {
                      conversationId: ai.conversationId,
                      provider: ai.provider,
                      model: ai.model,
                      totalTokens: ai.totalTokens ?? null,
                    },
                  }),
                  provider: ai.provider,
                  model: ai.model,
                },
              },
            },
            include: { scanAnalysis: true },
          });
          await this.gamification.processScan(tx, article.id, userId);
          return { article, reused: false };
        },
        { maxWait: 15000, timeout: 30000 },
      );
      if (outcome.reused) await this.media.remove(media.publicId);
      return this.response(outcome.article);
    } catch (error) {
      await this.media.remove(media.publicId);
      throw error;
    }
  }
  private response(
    article: import('@prisma/client').Prisma.ArticleGetPayload<{
      include: { scanAnalysis: true };
    }>,
  ) {
    return {
      article,
      ...visionResultFields(article),
      vision: {
        imageUrl: article?.image,
        provider: article?.scanAnalysis?.provider,
        model: article?.scanAnalysis?.model,
      },
    };
  }
}
