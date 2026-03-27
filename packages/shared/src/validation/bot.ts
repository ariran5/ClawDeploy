import { z } from 'zod';

export const createBotSchema = z.object({
  name: z.string().min(1, 'Bot name is required').max(255),
  description: z.string().max(1024).nullable().optional(),
  vpsId: z.string().uuid().nullable().optional(),
});

export const updateBotSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1024).nullable().optional(),
  vpsId: z.string().uuid().nullable().optional(),
});

export const botConfigSchema = z.object({
  openrouterKey: z.string().min(1, 'OpenRouter API key is required'),
  primaryModel: z.string().min(1, 'Primary model is required'),
  fallbackModel: z.string().nullable().optional(),
  maxTokensPerRequest: z.number().int().positive().default(4096),
  maxTokensPerDay: z.number().int().positive().nullable().optional(),
  temperature: z.string().default('0.7'),
  systemPrompt: z.string().max(16384).nullable().optional(),
  agentSettings: z.record(z.unknown()).nullable().optional(),
});

export const telegramTokenSchema = z.object({
  botToken: z.string().regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid Telegram bot token format'),
  allowedUsers: z.array(z.string()).optional(),
});

export type CreateBotInput = z.infer<typeof createBotSchema>;
export type UpdateBotInput = z.infer<typeof updateBotSchema>;
export type BotConfigInput = z.infer<typeof botConfigSchema>;
export type TelegramTokenInput = z.infer<typeof telegramTokenSchema>;
