import { pgTable, uuid, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { bots } from './bots.js';

export const botConfigs = pgTable('bot_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  botId: uuid('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }).unique(),
  encryptedOpenrouterKey: varchar('encrypted_openrouter_key', { length: 4096 }),
  primaryModel: varchar('primary_model', { length: 255 }).notNull(),
  fallbackModel: varchar('fallback_model', { length: 255 }),
  maxTokensPerRequest: integer('max_tokens_per_request').default(4096),
  maxTokensPerDay: integer('max_tokens_per_day'),
  temperature: varchar('temperature', { length: 10 }).default('0.7'),
  systemPrompt: varchar('system_prompt', { length: 16384 }),
  agentSettings: jsonb('agent_settings'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
