import { pgTable, uuid, varchar, integer, numeric, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { bots } from './bots.js';

export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  botId: uuid('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
  model: varchar('model', { length: 255 }).notNull(),
  promptTokens: integer('prompt_tokens').notNull(),
  completionTokens: integer('completion_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  cachedTokens: integer('cached_tokens').default(0),
  cost: numeric('cost', { precision: 12, scale: 8 }).notNull(),
  telegramChatId: varchar('telegram_chat_id', { length: 64 }),
  telegramUserId: varchar('telegram_user_id', { length: 64 }),
  messagePreview: varchar('message_preview', { length: 512 }),
  responsePreview: varchar('response_preview', { length: 512 }),
  generationId: varchar('generation_id', { length: 255 }),
  durationMs: integer('duration_ms'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('usage_logs_bot_created_idx').on(table.botId, table.createdAt),
  index('usage_logs_bot_model_idx').on(table.botId, table.model),
]);
