import { pgTable, uuid, varchar, timestamp, boolean, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { vpsServers } from './vps-servers.js';

export const botStatusEnum = pgEnum('bot_status', [
  'draft',
  'configured',
  'deploying',
  'running',
  'stopped',
  'error',
]);

export const bots = pgTable('bots', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  vpsId: uuid('vps_id').references(() => vpsServers.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1024 }),
  status: botStatusEnum('status').default('draft').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  lastError: varchar('last_error', { length: 2048 }),
  openclawConfig: jsonb('openclaw_config'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
