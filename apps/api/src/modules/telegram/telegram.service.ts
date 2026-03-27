import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { telegramConnections } from '../../db/schema/telegram-connections.js';
import { bots } from '../../db/schema/bots.js';
import { botConfigs } from '../../db/schema/bot-configs.js';
import { encrypt, decrypt } from '../../lib/crypto.js';
import { generateOpenclawConfig } from '../../lib/openclaw.js';

interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

export async function verifyTelegramToken(token: string): Promise<TelegramBotInfo> {
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await response.json() as { ok: boolean; result?: TelegramBotInfo; description?: string };

  if (!data.ok || !data.result) {
    throw Object.assign(new Error(data.description || 'Invalid Telegram bot token'), { statusCode: 400 });
  }

  return data.result;
}

export async function getTelegramConnection(botId: string) {
  const [conn] = await db.select({
    id: telegramConnections.id,
    botId: telegramConnections.botId,
    telegramBotId: telegramConnections.telegramBotId,
    telegramUsername: telegramConnections.telegramUsername,
    botName: telegramConnections.botName,
    allowedUsers: telegramConnections.allowedUsers,
    isVerified: telegramConnections.isVerified,
    isActive: telegramConnections.isActive,
    lastVerifiedAt: telegramConnections.lastVerifiedAt,
    createdAt: telegramConnections.createdAt,
    updatedAt: telegramConnections.updatedAt,
  })
    .from(telegramConnections)
    .where(eq(telegramConnections.botId, botId));

  return conn ?? null;
}

export async function setTelegramToken(botId: string, token: string, allowedUsers?: string[]) {
  const botInfo = await verifyTelegramToken(token);
  const encryptedToken = encrypt(token);

  const existing = await getTelegramConnection(botId);

  if (existing) {
    await db.update(telegramConnections)
      .set({
        encryptedBotToken: encryptedToken,
        telegramBotId: botInfo.id,
        telegramUsername: botInfo.username,
        botName: botInfo.first_name,
        allowedUsers: allowedUsers ?? existing.allowedUsers,
        isVerified: true,
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(telegramConnections.botId, botId));
  } else {
    await db.insert(telegramConnections).values({
      botId,
      encryptedBotToken: encryptedToken,
      telegramBotId: botInfo.id,
      telegramUsername: botInfo.username,
      botName: botInfo.first_name,
      allowedUsers: allowedUsers ?? null,
      isVerified: true,
      lastVerifiedAt: new Date(),
    });
  }

  await regenerateOpenclawConfig(botId);

  return {
    telegramBotId: botInfo.id,
    telegramUsername: botInfo.username,
    botName: botInfo.first_name,
    allowedUsers: allowedUsers ?? null,
    isVerified: true,
  };
}

export async function updateAllowedUsers(botId: string, allowedUsers: string[]) {
  await db.update(telegramConnections)
    .set({ allowedUsers, updatedAt: new Date() })
    .where(eq(telegramConnections.botId, botId));

  await regenerateOpenclawConfig(botId);
}

export async function removeTelegramConnection(botId: string) {
  await db.delete(telegramConnections).where(eq(telegramConnections.botId, botId));
  await regenerateOpenclawConfig(botId);
}

async function regenerateOpenclawConfig(botId: string) {
  const [config] = await db.select()
    .from(botConfigs)
    .where(eq(botConfigs.botId, botId));

  if (!config?.encryptedOpenrouterKey) return;

  const [telegram] = await db.select()
    .from(telegramConnections)
    .where(eq(telegramConnections.botId, botId));

  const openclawConfig = generateOpenclawConfig({
    openrouterKey: decrypt(config.encryptedOpenrouterKey),
    primaryModel: config.primaryModel,
    fallbackModel: config.fallbackModel,
    telegramBotToken: telegram ? decrypt(telegram.encryptedBotToken) : null,
    telegramAllowedUsers: telegram?.allowedUsers ?? null,
    maxTokensPerRequest: config.maxTokensPerRequest,
    maxTokensPerDay: config.maxTokensPerDay,
    systemPrompt: config.systemPrompt,
  });

  await db.update(bots)
    .set({ openclawConfig, updatedAt: new Date() })
    .where(eq(bots.id, botId));
}
