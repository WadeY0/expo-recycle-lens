import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, ChallengeDefinition } from '@prisma/client';
import { TenantService } from 'src/common/services/tenant.service';
import { GamificationQueryDto } from './dto/gamification-query.dto';
import { XP_POLICY, levelProgress, plantState } from './gamification.policy';
import { GAMIFICATION_TIMEZONE, periodsAt } from './gamification.time';
import {
  eligibleScanResult,
  eligibleScanXpResult,
  eligibleScanWhere,
} from './scan-eligibility';

@Injectable()
export class GamificationService {
  constructor(private readonly tenants: TenantService) {}

  async lockUser(tx: Prisma.TransactionClient, userId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext('gamification'))`;
  }

  // Internal trusted workflow only. Caller must use the SAME transaction as scan creation.
  async processScan(
    tx: Prisma.TransactionClient,
    scanId: string,
    userId: string,
  ) {
    await this.lockUser(tx, userId);
    const scan = await tx.scanAnalysis.findFirst({
      where: {
        articleId: scanId,
        article: { createdById: userId, type: 'ai_scan', deletedAt: null },
      },
      include: {
        wasteItem: { include: { article: { include: { category: true } } } },
      },
    });
    if (!scan || !eligibleScanXpResult(scan.result, scan.wasteSlug)) return;
    const item = scan.wasteItem;
    const canonical =
      eligibleScanResult(scan.result, scan.wasteSlug) &&
      item &&
      item.article.type === 'library' &&
      item.article.status === 'active' &&
      !item.article.deletedAt &&
      (!item.article.category ||
        (item.article.category.status === 'active' &&
          !item.article.category.deletedAt));
    if (eligibleScanResult(scan.result, scan.wasteSlug) && !canonical) return;
    /* Canonical visibility remains required for old matched records; standalone
       scans have no wasteItem and continue through the same capped XP ledger. */
    const settings = await tx.gamificationSettings.findUnique({
      where: { key: 'phase3' },
    });
    if (!settings)
      throw new ServiceUnavailableException(
        'Gamification migration is required',
      );
    if (scan.createdAt < settings.activatedAt) return;
    const eventKey = `scan:${scanId}`;
    if (
      await tx.xPTransaction.findUnique({
        where: { userId_eventKey: { userId, eventKey } },
      })
    )
      return;
    await tx.userGamificationProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    const at = scan.createdAt;
    const periods = periodsAt(at);
    const rewarded = await tx.xPTransaction.count({
      where: {
        userId,
        kind: 'scan',
        localDay: periods.daily.key,
        amount: { gt: 0 },
      },
    });
    await this.award(
      tx,
      userId,
      eventKey,
      'scan',
      rewarded < XP_POLICY.dailyScanLimit ? XP_POLICY.scan : 0,
      rewarded < XP_POLICY.dailyScanLimit ? 'eligible_scan' : 'daily_limit',
      at,
      scanId,
    );
    await tx.userGamificationProfile.update({
      where: { userId },
      data: { eligibleScans: { increment: 1 } },
    });

    if (canonical && item) {
      const discovery = await tx.wasteDiscovery.findUnique({
        where: { userId_wasteSlug: { userId, wasteSlug: item.slug } },
      });
      if (!discovery) {
        // Covers scans persisted by an older backend during the migration/deployment window.
        const historical = await tx.scanAnalysis.findFirst({
          where: {
            ...eligibleScanWhere,
            wasteSlug: item.slug,
            articleId: { not: scanId },
            createdAt: { lte: at },
            article: { createdById: userId, type: 'ai_scan', deletedAt: null },
            AND: [
              ...(eligibleScanWhere.AND as Prisma.ScanAnalysisWhereInput[]),
              { result: { path: ['matchedWaste', 'slug'], equals: item.slug } },
            ],
          },
          orderBy: [{ createdAt: 'asc' }, { articleId: 'asc' }],
        });
        await tx.wasteDiscovery.create({
          data: {
            userId,
            wasteSlug: item.slug,
            firstScanId: historical?.articleId ?? scanId,
            discoveredAt: historical?.createdAt ?? at,
            historical: !!historical,
          },
        });
        if (!historical)
          await this.award(
            tx,
            userId,
            `discovery:${item.slug}`,
            'discovery',
            XP_POLICY.discovery,
            'first_discovery',
            at,
            scanId,
          );
      }
    }
    await this.updateChallenges(tx, userId, at);
    await this.unlockAchievements(tx, userId, at);
  }

  private async award(
    tx: Prisma.TransactionClient,
    userId: string,
    eventKey: string,
    kind: string,
    amount: number,
    reason: string,
    at: Date,
    scanId: string | null = null,
  ) {
    // Every writer is serialized by lockUser, and the unique constraint is the final barrier.
    await tx.xPTransaction.create({
      data: {
        userId,
        eventKey,
        kind,
        amount,
        reason,
        scanId,
        occurredAt: at,
        localDay: periodsAt(at).daily.key,
      },
    });
    if (amount)
      await tx.userGamificationProfile.update({
        where: { userId },
        data: { totalXp: { increment: amount } },
      });
  }

  private period(def: ChallengeDefinition, at: Date) {
    const periods = periodsAt(at);
    if (def.period !== 'daily' && def.period !== 'weekly')
      throw new Error('Unknown challenge period');
    return def.period === 'daily' ? periods.daily : periods.weekly;
  }

  private async updateChallenges(
    tx: Prisma.TransactionClient,
    userId: string,
    at: Date,
  ) {
    const definitions = await tx.challengeDefinition.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const periods = periodsAt(at);
    const [dailyScans, weekDays] = await Promise.all([
      tx.xPTransaction.count({
        where: { userId, kind: 'scan', localDay: periods.daily.key },
      }),
      tx.xPTransaction.groupBy({
        by: ['localDay'],
        where: {
          userId,
          kind: 'scan',
          occurredAt: { gte: periods.weekly.start, lt: periods.weekly.end },
        },
      }),
    ]);
    // Daily definitions precede weekly ones so this event's daily completions count immediately.
    for (const def of definitions) {
      if (
        !['eligible_scans', 'distinct_scan_days', 'daily_completions'].includes(
          def.metric,
        )
      )
        throw new Error('Unknown challenge metric');
      const period = this.period(def, at);
      const where = {
        userId_challengeKey_periodKey: {
          userId,
          challengeKey: def.key,
          periodKey: period.key,
        },
      };
      const previous = await tx.userChallengeProgress.findUnique({ where });
      if (previous?.rewardedAt) continue;
      const dailyCompletions =
        def.metric === 'daily_completions'
          ? await tx.userChallengeProgress.count({
              where: {
                userId,
                challenge: { period: 'daily' },
                completedAt: {
                  gte: periods.weekly.start,
                  lt: periods.weekly.end,
                },
              },
            })
          : 0;
      const progress = Math.min(
        def.target,
        def.metric === 'eligible_scans'
          ? dailyScans
          : def.metric === 'distinct_scan_days'
            ? weekDays.length
            : dailyCompletions,
      );
      const completed = progress >= def.target;
      await tx.userChallengeProgress.upsert({
        where,
        create: {
          userId,
          challengeKey: def.key,
          periodKey: period.key,
          progress,
          completedAt: completed ? at : null,
        },
        update: {
          progress,
          completedAt: completed ? (previous?.completedAt ?? at) : null,
        },
      });
      if (completed) {
        const kind =
          def.period === 'daily' ? 'daily_challenge' : 'weekly_challenge';
        const reward =
          def.period === 'daily'
            ? XP_POLICY.dailyChallenge
            : XP_POLICY.weeklyChallenge;
        if (def.rewardXp !== reward)
          throw new Error('Challenge definition and XP policy differ');
        await this.award(
          tx,
          userId,
          `challenge:${def.key}:${period.key}`,
          kind,
          reward,
          def.key,
          at,
        );
        await tx.userChallengeProgress.update({
          where,
          data: { rewardedAt: at },
        });
      }
    }
  }

  private async metrics(tx: Prisma.TransactionClient, userId: string) {
    const [profile, discoveries, rewardedDiscoveries, daily, weekly] =
      await Promise.all([
        tx.userGamificationProfile.findUnique({ where: { userId } }),
        tx.wasteDiscovery.count({ where: { userId } }),
        tx.xPTransaction.count({
          where: { userId, kind: 'discovery', amount: { gt: 0 } },
        }),
        tx.userChallengeProgress.count({
          where: {
            userId,
            challenge: { period: 'daily' },
            rewardedAt: { not: null },
          },
        }),
        tx.userChallengeProgress.count({
          where: {
            userId,
            challenge: { period: 'weekly' },
            rewardedAt: { not: null },
          },
        }),
      ]);
    const level = levelProgress(profile?.totalXp ?? 0);
    return {
      level,
      eligible_scans: profile?.eligibleScans ?? 0,
      discoveries,
      rewarded_discoveries: rewardedDiscoveries,
      daily_completions: daily,
      weekly_completions: weekly,
      user_level: level.level,
    };
  }
  private metric(
    metrics: Awaited<ReturnType<GamificationService['metrics']>>,
    name: string,
  ): number {
    switch (name) {
      case 'eligible_scans':
        return metrics.eligible_scans;
      case 'discoveries':
        return metrics.discoveries;
      case 'rewarded_discoveries':
        return metrics.rewarded_discoveries;
      case 'daily_completions':
        return metrics.daily_completions;
      case 'weekly_completions':
        return metrics.weekly_completions;
      case 'user_level':
        return metrics.user_level;
      default:
        throw new Error('Unknown achievement metric');
    }
  }
  private async unlockAchievements(
    tx: Prisma.TransactionClient,
    userId: string,
    at: Date,
  ) {
    const [definitions, metrics] = await Promise.all([
      tx.achievementDefinition.findMany(),
      this.metrics(tx, userId),
    ]);
    await tx.userAchievement.createMany({
      data: definitions
        .filter((def) => this.metric(metrics, def.metric) >= def.target)
        .map((def) => ({ userId, achievementKey: def.key, unlockedAt: at })),
      skipDuplicates: true,
    });
  }

  private async achievementsIn(
    tx: Prisma.TransactionClient,
    userId: string,
    knownMetrics?: Awaited<ReturnType<GamificationService['metrics']>>,
  ) {
    const [definitions, unlocked, metrics] = await Promise.all([
      tx.achievementDefinition.findMany({ orderBy: { sortOrder: 'asc' } }),
      tx.userAchievement.findMany({ where: { userId } }),
      knownMetrics ?? this.metrics(tx, userId),
    ]);
    const dates = new Map(
      unlocked.map((row) => [row.achievementKey, row.unlockedAt]),
    );
    return definitions.map((def) => ({
      key: def.key,
      title: def.title,
      description: def.description,
      target: def.target,
      progress: Math.min(def.target, this.metric(metrics, def.metric)),
      unlocked: dates.has(def.key),
      unlockedAt: dates.get(def.key) ?? null,
      rewardXp: XP_POLICY.achievement,
    }));
  }
  private async challengesIn(
    tx: Prisma.TransactionClient,
    userId: string,
    at: Date,
  ) {
    const periods = periodsAt(at);
    const [definitions, records] = await Promise.all([
      tx.challengeDefinition.findMany({ orderBy: { sortOrder: 'asc' } }),
      tx.userChallengeProgress.findMany({
        where: {
          userId,
          periodKey: { in: [periods.daily.key, periods.weekly.key] },
        },
      }),
    ]);
    const index = new Map(
      records.map((row) => [`${row.challengeKey}:${row.periodKey}`, row]),
    );
    return definitions.map((def) => {
      const period = this.period(def, at);
      const record = index.get(`${def.key}:${period.key}`);
      return {
        key: def.key,
        title: def.title,
        period: def.period,
        periodKey: period.key,
        startsAt: period.start,
        endsAt: period.end,
        target: def.target,
        progress: record?.progress ?? 0,
        rewardXp: def.rewardXp,
        completedAt: record?.completedAt ?? null,
        rewardedAt: record?.rewardedAt ?? null,
      };
    });
  }
  private async read<T>(
    userId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    // userId originates in JWT; the tenant client is server-resolved, never client-supplied.
    if (!userId) throw new NotFoundException();
    const prisma = await this.tenants.getPrismaClient();
    return prisma.$transaction(work, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }
  async overview(userId: string) {
    return this.read(userId, async (tx) => {
      const at = new Date();
      const metrics = await this.metrics(tx, userId);
      const [achievements, challenges] = await Promise.all([
        this.achievementsIn(tx, userId, metrics),
        this.challengesIn(tx, userId, at),
      ]);
      return {
        ...metrics.level,
        timezone: GAMIFICATION_TIMEZONE,
        serverTime: at,
        plant: plantState(metrics.level.level),
        uniqueDiscoveries: metrics.discoveries,
        eligibleScans: metrics.eligible_scans,
        activeChallenges: challenges,
        recentAchievements: achievements
          .filter((row) => row.unlocked)
          .sort((a, b) => b.unlockedAt!.getTime() - a.unlockedAt!.getTime())
          .slice(0, 3),
        policy: XP_POLICY,
      };
    });
  }
  async achievements(userId: string) {
    return this.read(userId, (tx) => this.achievementsIn(tx, userId));
  }
  async challenges(userId: string) {
    return this.read(userId, (tx) => this.challengesIn(tx, userId, new Date()));
  }
  async challenge(userId: string, key: string) {
    const row = (await this.challenges(userId)).find((def) => def.key === key);
    if (!row) throw new NotFoundException('Challenge not found');
    return row;
  }
  async plant(userId: string) {
    return this.read(userId, async (tx) => {
      const metrics = await this.metrics(tx, userId);
      return { ...plantState(metrics.level.level), ...metrics.level };
    });
  }
  async xpHistory(userId: string, query: GamificationQueryDto) {
    return this.read(userId, async (tx) => {
      const [data, total] = await Promise.all([
        tx.xPTransaction.findMany({
          where: { userId },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.perPage,
          take: query.perPage,
          select: {
            id: true,
            kind: true,
            amount: true,
            reason: true,
            scanId: true,
            occurredAt: true,
            localDay: true,
          },
        }),
        tx.xPTransaction.count({ where: { userId } }),
      ]);
      return {
        data,
        total,
        page: query.page,
        perPage: query.perPage,
        totalPages: Math.ceil(total / query.perPage),
      };
    });
  }
  async discoveries(userId: string, query: GamificationQueryDto) {
    return this.read(userId, async (tx) => {
      const [rows, total] = await Promise.all([
        tx.wasteDiscovery.findMany({
          where: { userId },
          orderBy: [{ discoveredAt: 'desc' }, { wasteSlug: 'asc' }],
          skip: (query.page - 1) * query.perPage,
          take: query.perPage,
          include: {
            wasteItem: {
              include: { article: { include: { category: true } } },
            },
          },
        }),
        tx.wasteDiscovery.count({ where: { userId } }),
      ]);
      const data = rows.map((row) => {
        const article = row.wasteItem.article;
        const visible =
          article.status === 'active' &&
          !article.deletedAt &&
          (!article.category ||
            (article.category.status === 'active' &&
              !article.category.deletedAt));
        return {
          wasteSlug: row.wasteSlug,
          name: visible ? article.title : 'Mục thư viện không còn khả dụng',
          articleId: visible ? article.id : null,
          discoveredAt: row.discoveredAt,
          historical: row.historical,
        };
      });
      return {
        data,
        total,
        page: query.page,
        perPage: query.perPage,
        totalPages: Math.ceil(total / query.perPage),
      };
    });
  }
}
