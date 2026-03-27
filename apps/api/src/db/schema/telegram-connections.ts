import { pgTable, uuid, varchar, bigint, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { bots } from './bots.js';

export const telegramConnections = pgTable('telegram_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  botId: uuid('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }).unique(),
  encryptedBotToken: varchar('encrypted_bot_token', { length: 4096 }).notNull(),
  telegramBotId: bigint('telegram_bot_id', { mode: 'number' }),
  telegramUsername: varchar('telegram_username', { length: 255 }),
  botName: varchar('bot_name', { length: 255 }),
  allowedUsers: jsonb('allowed_users').$type<string[]>(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  lastVerifiedAt: timestamp('last_verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
