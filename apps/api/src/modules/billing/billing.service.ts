import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { subscriptions } from '../../db/schema/subscriptions.js';
import { PLAN_LIMITS } from '../../config/constants.js';
import type { Plan } from '@openclaw/shared';

export async function getSubscription(userId: string) {
  const [sub] = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  if (!sub) {
    // Create a free subscription if none exists
    const [newSub] = await db.insert(subscriptions).values({
      userId,
      plan: 'free',
      maxBots: PLAN_LIMITS.free.maxBots,
      maxVpsServers: PLAN_LIMITS.free.maxVpsServers,
    }).returning();
    return newSub;
  }

  return sub;
}

export async function changePlan(userId: string, plan: Plan) {
  const limits = PLAN_LIMITS[plan];

  const [sub] = await db.update(subscriptions)
    .set({
      plan,
      maxBots: limits.maxBots,
      maxVpsServers: limits.maxVpsServers,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId))
    .returning();

  if (!sub) {
    const [newSub] = await db.insert(subscriptions).values({
      userId,
      plan,
      maxBots: limits.maxBots,
      maxVpsServers: limits.maxVpsServers,
    }).returning();
    return newSub;
  }

  return sub;
}

export async function cancelSubscription(userId: string) {
  const [sub] = await db.update(subscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId))
    .returning();

  return sub;
}
