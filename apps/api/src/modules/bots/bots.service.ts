import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { bots } from '../../db/schema/bots.js';
import { botConfigs } from '../../db/schema/bot-configs.js';
import { telegramConnections } from '../../db/schema/telegram-connections.js';
import { subscriptions } from '../../db/schema/subscriptions.js';
import { vpsServers } from '../../db/schema/vps-servers.js';
import { encrypt, decrypt } from '../../lib/crypto.js';
import { generateOpenclawConfig, generateConfigToml } from '../../lib/openclaw.js';
import { executeCommand, uploadFile } from '../../lib/ssh.js';
import { OPENCLAW_DEPLOY_DIR } from '../../config/constants.js';
import type { CreateBotInput, UpdateBotInput, BotConfigInput } from '@clawdeploy/shared';

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

export async function deleteBot(userId: string, botId: string, force = false) {
  const bot = await getBot(userId, botId);

  // Clean up VPS if bot has one assigned
  if (bot.vpsId) {
    try {
      const ssh = await getVpsConnection(bot);
      const deployDir = `${OPENCLAW_DEPLOY_DIR}/${botId}`;

      // Stop and remove container, volumes, and image
      const downResult = await executeCommand(ssh, `cd ${deployDir} && docker compose down --volumes --rmi all 2>&1 || true`);
      console.log(`[delete:${botId}] docker compose down: ${downResult.stdout.trim()}`);

      // Remove deploy directory
      await executeCommand(ssh, `rm -rf ${deployDir}`);

      // Clean up dangling Docker resources
      await executeCommand(ssh, 'docker system prune -f 2>&1 || true');

      console.log(`[delete:${botId}] VPS cleanup completed`);
    } catch (err: any) {
      if (!force) {
        throw Object.assign(
          new Error(`VPS cleanup failed: ${err.message}. Use force=true to delete from DB anyway.`),
          { statusCode: 502 },
        );
      }
      console.error(`[delete:${botId}] VPS cleanup failed (force=true, proceeding): ${err.message}`);
    }
  }

  // Cascade deletes config, telegram, usage_logs via FK constraints
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
  const containerName = `openclaw-${botId.slice(0, 8)}`;

  await db.update(bots)
    .set({ status: 'deploying', updatedAt: new Date() })
    .where(eq(bots.id, botId));

  try {
    // --- Ensure Docker & Compose are installed ---
    const dockerCheck = await executeCommand(ssh, 'docker --version 2>&1');
    if (dockerCheck.code !== 0) {
      console.log(`[deploy:${botId}] Docker not found, installing...`);
      const installResult = await executeCommand(ssh, 'curl -fsSL https://get.docker.com | sh 2>&1');
      if (installResult.code !== 0) {
        throw new Error(`Failed to install Docker: ${installResult.stderr || installResult.stdout}`);
      }
      await executeCommand(ssh, 'systemctl enable docker && systemctl start docker 2>&1');
    }

    const composeCheck = await executeCommand(ssh, 'docker compose version 2>&1');
    if (composeCheck.code !== 0) {
      console.log(`[deploy:${botId}] Docker Compose plugin not found, installing...`);
      await executeCommand(ssh, `
        apt-get update -qq && apt-get install -y -qq docker-compose-plugin 2>&1 || {
          mkdir -p /usr/local/lib/docker/cli-plugins &&
          curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose &&
          chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
        }
      `);
      const recheck = await executeCommand(ssh, 'docker compose version 2>&1');
      if (recheck.code !== 0) {
        throw new Error('Failed to install Docker Compose');
      }
    }

    // --- Build config.toml from fresh DB data ---
    const [config] = await db.select()
      .from(botConfigs)
      .where(eq(botConfigs.botId, botId));

    if (!config?.encryptedOpenrouterKey) {
      throw new Error('Bot config not found or missing OpenRouter key');
    }

    const [telegram] = await db.select()
      .from(telegramConnections)
      .where(eq(telegramConnections.botId, botId));

    const openrouterKey = decrypt(config.encryptedOpenrouterKey);
    const telegramToken = telegram ? decrypt(telegram.encryptedBotToken) : null;

    const configToml = generateConfigToml({
      openrouterKey,
      primaryModel: config.primaryModel,
      fallbackModel: config.fallbackModel,
      telegramBotToken: telegramToken,
      telegramAllowedUsers: telegram?.allowedUsers ?? null,
      maxTokensPerRequest: config.maxTokensPerRequest,
      maxTokensPerDay: config.maxTokensPerDay,
      systemPrompt: config.systemPrompt,
    });

    // --- Stop & remove old container if exists ---
    await executeCommand(ssh, `cd ${deployDir} && docker compose down 2>&1 || true`);

    // --- Create deploy directory & upload config ---
    await executeCommand(ssh, `mkdir -p ${deployDir}`);
    await uploadFile(ssh, `${deployDir}/config.toml`, configToml);

    // --- Generate docker-compose.yml ---
    const compose = `services:
  openclaw:
    image: ghcr.io/zeroclaw-labs/zeroclaw:latest
    container_name: ${containerName}
    restart: unless-stopped
    command: ["daemon", "--host", "0.0.0.0"]
    ports:
      - "42617:42617"
    volumes:
      - zeroclaw-data:/zeroclaw-data
      - ./config.toml:/zeroclaw-data/.zeroclaw/config.toml:ro
    environment:
      - API_KEY=${openrouterKey}
      - PROVIDER=openrouter
      - ZEROCLAW_ALLOW_PUBLIC_BIND=true
      - ZEROCLAW_GATEWAY_PORT=42617
    healthcheck:
      test: ["CMD", "zeroclaw", "status", "--format=exit-code"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 128M
        reservations:
          cpus: "0.5"
          memory: 32M
volumes:
  zeroclaw-data:
`;
    await uploadFile(ssh, `${deployDir}/docker-compose.yml`, compose);

    // --- Pull & start ---
    const pullResult = await executeCommand(ssh, `cd ${deployDir} && docker compose pull 2>&1`);
    if (pullResult.code !== 0) {
      throw new Error(`Docker pull failed: ${pullResult.stdout || pullResult.stderr}`);
    }

    const upResult = await executeCommand(ssh, `cd ${deployDir} && docker compose up -d 2>&1`);
    if (upResult.code !== 0) {
      throw new Error(`Docker compose up failed: ${upResult.stdout || upResult.stderr}`);
    }

    // --- Verify container is running ---
    const psResult = await executeCommand(ssh, `cd ${deployDir} && docker compose ps --format json 2>&1`);
    if (psResult.code !== 0 || !psResult.stdout.trim()) {
      const logs = await executeCommand(ssh, `cd ${deployDir} && docker compose logs --tail=50 2>&1`);
      throw new Error(`Container failed to start. Logs:\n${logs.stdout}`);
    }

    // Wait for gateway to initialize and verify health
    await executeCommand(ssh, 'sleep 3');
    const healthCheck = await executeCommand(ssh, `curl -sf http://127.0.0.1:42617/health 2>&1 || true`);
    console.log(`[deploy:${botId}] Health check: ${healthCheck.stdout.trim()}`);

    await db.update(bots)
      .set({ status: 'running', isActive: true, lastError: null, updatedAt: new Date() })
      .where(eq(bots.id, botId));

    return {
      status: 'running',
      message: 'Bot deployed successfully',
    };
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

  const startResult = await executeCommand(ssh, `cd ${deployDir} && docker compose start 2>&1`);
  if (startResult.code !== 0) {
    throw Object.assign(new Error(`Start failed: ${startResult.stdout || startResult.stderr}`), { statusCode: 500 });
  }

  await db.update(bots)
    .set({ status: 'running', isActive: true, updatedAt: new Date() })
    .where(eq(bots.id, botId));

  return { status: 'running' };
}

export async function stopBot(userId: string, botId: string) {
  const bot = await getBot(userId, botId);
  const ssh = await getVpsConnection(bot);
  const deployDir = `${OPENCLAW_DEPLOY_DIR}/${botId}`;

  const stopResult = await executeCommand(ssh, `cd ${deployDir} && docker compose stop 2>&1`);
  if (stopResult.code !== 0) {
    throw Object.assign(new Error(`Stop failed: ${stopResult.stdout || stopResult.stderr}`), { statusCode: 500 });
  }

  await db.update(bots)
    .set({ status: 'stopped', isActive: false, updatedAt: new Date() })
    .where(eq(bots.id, botId));

  return { status: 'stopped' };
}

export async function restartBot(userId: string, botId: string) {
  const bot = await getBot(userId, botId);
  const ssh = await getVpsConnection(bot);
  const deployDir = `${OPENCLAW_DEPLOY_DIR}/${botId}`;

  const restartResult = await executeCommand(ssh, `cd ${deployDir} && docker compose restart 2>&1`);
  if (restartResult.code !== 0) {
    throw Object.assign(new Error(`Restart failed: ${restartResult.stdout || restartResult.stderr}`), { statusCode: 500 });
  }

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
