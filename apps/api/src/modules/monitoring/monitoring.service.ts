import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { usageLogs } from '../../db/schema/usage-logs.js';
import { bots } from '../../db/schema/bots.js';

export async function getUsageSummary(userId: string, from?: Date, to?: Date) {
  const conditions = [eq(bots.userId, userId)];
  if (from) conditions.push(gte(usageLogs.createdAt, from));
  if (to) conditions.push(lte(usageLogs.createdAt, to));

  const [result] = await db.select({
    totalTokens: sql<number>`coalesce(sum(${usageLogs.totalTokens}), 0)::int`,
    totalCost: sql<string>`coalesce(sum(${usageLogs.cost}), 0)::text`,
    messageCount: sql<number>`count(*)::int`,
  })
    .from(usageLogs)
    .innerJoin(bots, eq(usageLogs.botId, bots.id))
    .where(and(...conditions));

  return result;
}

export async function getBotUsage(userId: string, botId: string, from?: Date, to?: Date) {
  // Verify bot ownership
  const [bot] = await db.select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)));

  if (!bot) {
    throw Object.assign(new Error('Bot not found'), { statusCode: 404 });
  }

  const conditions = [eq(usageLogs.botId, botId)];
  if (from) conditions.push(gte(usageLogs.createdAt, from));
  if (to) conditions.push(lte(usageLogs.createdAt, to));

  const [summary] = await db.select({
    totalTokens: sql<number>`coalesce(sum(${usageLogs.totalTokens}), 0)::int`,
    totalCost: sql<string>`coalesce(sum(${usageLogs.cost}), 0)::text`,
    messageCount: sql<number>`count(*)::int`,
  })
    .from(usageLogs)
    .where(and(...conditions));

  return summary;
}

export async function getDailyCosts(userId: string, days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const result = await db.select({
    date: sql<string>`date_trunc('day', ${usageLogs.createdAt})::date::text`,
    totalCost: sql<string>`sum(${usageLogs.cost})::text`,
    totalTokens: sql<number>`sum(${usageLogs.totalTokens})::int`,
    messageCount: sql<number>`count(*)::int`,
  })
    .from(usageLogs)
    .innerJoin(bots, eq(usageLogs.botId, bots.id))
    .where(and(eq(bots.userId, userId), gte(usageLogs.createdAt, from)))
    .groupBy(sql`date_trunc('day', ${usageLogs.createdAt})`)
    .orderBy(sql`date_trunc('day', ${usageLogs.createdAt})`);

  return result;
}

export async function getMessageLog(userId: string, botId: string, page = 1, limit = 50) {
  const [bot] = await db.select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)));

  if (!bot) {
    throw Object.assign(new Error('Bot not found'), { statusCode: 404 });
  }

  const offset = (page - 1) * limit;

  const [data, [{ count }]] = await Promise.all([
    db.select()
      .from(usageLogs)
      .where(eq(usageLogs.botId, botId))
      .orderBy(desc(usageLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(usageLogs)
      .where(eq(usageLogs.botId, botId)),
  ]);

  return {
    data,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

export async function getDashboardSummary(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [botStats, todayUsage] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      running: sql<number>`count(*) filter (where ${bots.status} = 'running')::int`,
    })
      .from(bots)
      .where(eq(bots.userId, userId)),
    getUsageSummary(userId, today),
  ]);

  return {
    totalBots: botStats[0]?.total ?? 0,
    runningBots: botStats[0]?.running ?? 0,
    todayCost: todayUsage.totalCost,
    todayTokens: todayUsage.totalTokens,
  };
}
