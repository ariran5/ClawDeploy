import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { vpsServers } from '../../db/schema/vps-servers.js';
import { subscriptions } from '../../db/schema/subscriptions.js';
import { encrypt, decrypt } from '../../lib/crypto.js';
import { testConnection, getServerHealth } from '../../lib/ssh.js';
import type { CreateVpsInput, UpdateVpsInput } from '@clawdeploy/shared';

export async function listVps(userId: string) {
  return db.select({
    id: vpsServers.id,
    userId: vpsServers.userId,
    name: vpsServers.name,
    host: vpsServers.host,
    port: vpsServers.port,
    username: vpsServers.username,
    authMethod: vpsServers.authMethod,
    status: vpsServers.status,
    provider: vpsServers.provider,
    lastHealthCheck: vpsServers.lastHealthCheck,
    createdAt: vpsServers.createdAt,
    updatedAt: vpsServers.updatedAt,
  })
    .from(vpsServers)
    .where(eq(vpsServers.userId, userId))
    .orderBy(desc(vpsServers.createdAt));
}

export async function createVps(userId: string, input: CreateVpsInput) {
  const [sub] = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(vpsServers)
    .where(eq(vpsServers.userId, userId));

  if (sub && count >= sub.maxVpsServers) {
    throw Object.assign(new Error(`VPS limit reached (${sub.maxVpsServers}). Upgrade your plan.`), { statusCode: 403 });
  }

  const encryptedCredential = encrypt(input.credential);

  const [vps] = await db.insert(vpsServers).values({
    userId,
    name: input.name,
    host: input.host,
    port: input.port,
    username: input.username,
    authMethod: input.authMethod,
    encryptedCredential,
    provider: input.provider,
  }).returning();

  return vps;
}

export async function getVps(userId: string, vpsId: string) {
  const [vps] = await db.select()
    .from(vpsServers)
    .where(and(eq(vpsServers.id, vpsId), eq(vpsServers.userId, userId)));

  if (!vps) {
    throw Object.assign(new Error('VPS server not found'), { statusCode: 404 });
  }

  return vps;
}

export async function updateVps(userId: string, vpsId: string, input: UpdateVpsInput) {
  await getVps(userId, vpsId);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name) updateData.name = input.name;
  if (input.host) updateData.host = input.host;
  if (input.port) updateData.port = input.port;
  if (input.username) updateData.username = input.username;
  if (input.authMethod) updateData.authMethod = input.authMethod;
  if (input.credential) updateData.encryptedCredential = encrypt(input.credential);
  if (input.provider) updateData.provider = input.provider;

  const [vps] = await db.update(vpsServers)
    .set(updateData)
    .where(and(eq(vpsServers.id, vpsId), eq(vpsServers.userId, userId)))
    .returning();

  return vps;
}

export async function deleteVps(userId: string, vpsId: string) {
  await getVps(userId, vpsId);
  await db.delete(vpsServers).where(and(eq(vpsServers.id, vpsId), eq(vpsServers.userId, userId)));
}

export async function testVpsConnection(userId: string, vpsId: string) {
  const vps = await getVps(userId, vpsId);
  const credential = decrypt(vps.encryptedCredential);

  const ok = await testConnection({
    host: vps.host,
    port: vps.port,
    username: vps.username,
    authMethod: vps.authMethod as 'password' | 'key',
    credential,
  });

  const newStatus = ok ? 'active' : 'unreachable';
  await db.update(vpsServers)
    .set({ status: newStatus, lastHealthCheck: new Date(), updatedAt: new Date() })
    .where(eq(vpsServers.id, vpsId));

  return { connected: ok, status: newStatus };
}

export async function getVpsHealth(userId: string, vpsId: string) {
  const vps = await getVps(userId, vpsId);
  const credential = decrypt(vps.encryptedCredential);

  const health = await getServerHealth({
    host: vps.host,
    port: vps.port,
    username: vps.username,
    authMethod: vps.authMethod as 'password' | 'key',
    credential,
  });

  await db.update(vpsServers)
    .set({ status: 'active', lastHealthCheck: new Date(), updatedAt: new Date() })
    .where(eq(vpsServers.id, vpsId));

  return health;
}
