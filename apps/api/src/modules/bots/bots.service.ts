import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { bots } from '../../db/schema/bots.js';
import { botConfigs } from '../../db/schema/bot-configs.js';
import { telegramConnections } from '../../db/schema/telegram-connections.js';
import { subscriptions } from '../../db/schema/subscriptions.js';
import { vpsServers } from '../../db/schema/vps-servers.js';
import { encrypt, decrypt } from '../../lib/crypto.js';
import { generateOpenclawConfig } from '../../lib/openclaw.js';
import { executeCommand, uploadFile } from '../../lib/ssh.js';
import { OPENCLAW_DEPLOY_DIR } from '../../config/constants.js';
import type { CreateBotInput, UpdateBotInput, BotConfigInput } from '@openclaw/shared';

export async function listBots(userId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const [data, [{ count }]] = await Promise.all([
    db.select()
      .from(bots)
      .where(eq(bots.userId, userId))
      .orderBy(desc(bots.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(bots)
      .where(eq(bots.userId, userId)),
  ]);

  return {
    data,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

export async function createBot(userId: string, input: CreateBotInput) {
  // Check plan limits
  const [sub] = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(bots)
    .where(eq(bots.userId, userId));

  if (sub && count >= sub.maxBots) {
    throw Object.assign(new Error(`Bot limit reached (${sub.maxBots}). Upgrade your plan.`), { statusCode: 403 });
  }

  const [bot] = await db.insert(bots).values({
    userId,
    name: input.name,
    description: input.description ?? null,
    vpsId: input.vpsId ?? null,
  }).returning();

  return bot;
}

export async function getBot(userId: string, botId: string) {
  const [bot] = await db.select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)));

  if (!bot) {
    throw Object.assign(new Error('Bot not found'), { statusCode: 404 });
  }

  return bot;
}

export async function updateBot(userId: string, botId: string, input: UpdateBotInput) {
  await getBot(userId, botId);

  const [bot] = await db.update(bots)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning();

  return bot;
}

export async function deleteBot(userId: string, botId: string) {
  await getBot(userId, botId);
  await db.delete(bots).where(and(eq(bots.id, botId), eq(bots.userId, userId)));
}

export async function getBotConfig(userId: string, botId: string) {
  await getBot(userId, botId);

  const [config] = await db.select()
    .from(botConfigs)
    .where(eq(botConfigs.botId, botId));

  return config ?? null;
}

export async function upsertBotConfig(userId: string, botId: string, input: BotConfigInput) {
  await getBot(userId, botId);

  const encryptedKey = encrypt(input.openrouterKey);

  const existing = await getBotConfig(userId, botId);

  let config;
  if (existing) {
    [config] = await db.update(botConfigs)
      .set({
        encryptedOpenrouterKey: encryptedKey,
        primaryModel: input.primaryModel,
        fallbackModel: input.fallbackModel ?? null,
        maxTokensPerRequest: input.maxTokensPerRequest,
        maxTokensPerDay: input.maxTokensPerDay ?? null,
        temperature: input.temperature,
        systemPrompt: input.systemPrompt ?? null,
        agentSettings: input.agentSettings ?? null,
        updatedAt: new Date(),
      })
      .where(eq(botConfigs.botId, botId))
      .returning();
  } else {
    [config] = await db.insert(botConfigs).values({
      botId,
      encryptedOpenrouterKey: encryptedKey,
      primaryModel: input.primaryModel,
      fallbackModel: input.fallbackModel ?? null,
      maxTokensPerRequest: input.maxTokensPerRequest,
      maxTokensPerDay: input.maxTokensPerDay ?? null,
      temperature: input.temperature,
      systemPrompt: input.systemPrompt ?? null,
      agentSettings: input.agentSettings ?? null,
    }).returning();
  }

  // Regenerate openclaw.json
  const telegram = await db.select()
    .from(telegramConnections)
    .where(eq(telegramConnections.botId, botId))
    .limit(1);

  const openclawConfig = generateOpenclawConfig({
    openrouterKey: input.openrouterKey,
    primaryModel: input.primaryModel,
    fallbackModel: input.fallbackModel,
    telegramBotToken: telegram[0] ? decrypt(telegram[0].encryptedBotToken) : null,
    maxTokensPerRequest: input.maxTokensPerRequest,
    maxTokensPerDay: input.maxTokensPerDay,
    systemPrompt: input.systemPrompt,
  });

  await db.update(bots)
    .set({ openclawConfig, status: 'configured', updatedAt: new Date() })
    .where(eq(bots.id, botId));

  return config;
}

// --- Deploy & Lifecycle ---

async function getVpsConnection(bot: { vpsId: string | null }) {
  if (!bot.vpsId) {
    throw Object.assign(new Error('Bot has no VPS assigned'), { statusCode: 400 });
  }

  const [vps] = await db.select()
    .from(vpsServers)
    .where(eq(vpsServers.id, bot.vpsId));

  if (!vps) {
    throw Object.assign(new Error('VPS server not found'), { statusCode: 404 });
  }

  return {
    host: vps.host,
    port: vps.port,
    username: vps.username,
    authMethod: vps.authMethod as 'password' | 'key',
    credential: decrypt(vps.encryptedCredential),
  };
}

export async function deployBot(userId: string, botId: string) {
  const bot = await getBot(userId, botId);

  if (!bot.openclawConfig) {
    throw Object.assign(new Error('Bot is not configured yet. Set up config first.'), { statusCode: 400 });
  }

  const ssh = await getVpsConnection(bot);
  const deployDir = `${OPENCLAW_DEPLOY_DIR}/${botId}`;

  await db.update(bots)
    .set({ status: 'deploying', updatedAt: new Date() })
    .where(eq(bots.id, botId));

  try {
    // Create deploy directory
    await executeCommand(ssh, `mkdir -p ${deployDir}`);

    // Upload openclaw.json
    await uploadFile(ssh, `${deployDir}/openclaw.json`, JSON.stringify(bot.openclawConfig, null, 2));

    // Generate docker-compose.yml for OpenClaw
    const compose = `version: "3.8"
services:
  openclaw:
    image: openclaw/openclaw:latest
    container_name: openclaw-${botId.slice(0, 8)}
    restart: unless-stopped
    volumes:
      - ./openclaw.json:/app/openclaw.json:ro
    environment:
      - OPENCLAW_CONFIG=/app/openclaw.json
`;
    await uploadFile(ssh, `${deployDir}/docker-compose.yml`, compose);

    // Pull and start
    await executeCommand(ssh, `cd ${deployDir} && docker compose pull 2>&1`);
    await executeCommand(ssh, `cd ${deployDir} && docker compose up -d 2>&1`);

    await db.update(bots)
      .set({ status: 'running', isActive: true, lastError: null, updatedAt: new Date() })
      .where(eq(bots.id, botId));

    return { status: 'running', message: 'Bot deployed successfully' };
  } catch (err: any) {
    await db.update(bots)
      .set({ status: 'error', lastError: err.message, updatedAt: new Date() })
      .where(eq(bots.id, botId));

    throw Object.assign(new Error(`Deploy failed: ${err.message}`), { statusCode: 500 });
  }
}

export async function startBot(userId: string, botId: string) {
  const bot = await getBot(userId, botId);
  const ssh = await getVpsConnection(bot);
  const deployDir = `${OPENCLAW_DEPLOY_DIR}/${botId}`;

  await executeCommand(ssh, `cd ${deployDir} && docker compose start 2>&1`);

  await db.update(bots)
    .set({ status: 'running', isActive: true, updatedAt: new Date() })
    .where(eq(bots.id, botId));

  return { status: 'running' };
}

export async function stopBot(userId: string, botId: string) {
  const bot = await getBot(userId, botId);
  const ssh = await getVpsConnection(bot);
  const deployDir = `${OPENCLAW_DEPLOY_DIR}/${botId}`;

  await executeCommand(ssh, `cd ${deployDir} && docker compose stop 2>&1`);

  await db.update(bots)
    .set({ status: 'stopped', isActive: false, updatedAt: new Date() })
    .where(eq(bots.id, botId));

  return { status: 'stopped' };
}

export async function restartBot(userId: string, botId: string) {
  const bot = await getBot(userId, botId);
  const ssh = await getVpsConnection(bot);
  const deployDir = `${OPENCLAW_DEPLOY_DIR}/${botId}`;

  await executeCommand(ssh, `cd ${deployDir} && docker compose restart 2>&1`);

  await db.update(bots)
    .set({ status: 'running', isActive: true, updatedAt: new Date() })
    .where(eq(bots.id, botId));

  return { status: 'running' };
}

export async function getBotStatus(userId: string, botId: string) {
  const bot = await getBot(userId, botId);
  const ssh = await getVpsConnection(bot);
  const deployDir = `${OPENCLAW_DEPLOY_DIR}/${botId}`;

  const result = await executeCommand(ssh, `cd ${deployDir} && docker compose ps --format json 2>&1`);

  return { dbStatus: bot.status, containers: result.stdout.trim() };
}

export async function getBotLogs(userId: string, botId: string, lines = 100) {
  const bot = await getBot(userId, botId);
  const ssh = await getVpsConnection(bot);
  const deployDir = `${OPENCLAW_DEPLOY_DIR}/${botId}`;

  const result = await executeCommand(ssh, `cd ${deployDir} && docker compose logs --tail=${lines} 2>&1`);

  return { logs: result.stdout };
}
