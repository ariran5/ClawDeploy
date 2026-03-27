import { pgTable, uuid, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const vpsStatusEnum = pgEnum('vps_status', [
  'pending',
  'connecting',
  'active',
  'unreachable',
  'error',
]);

export const vpsServers = pgTable('vps_servers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  host: varchar('host', { length: 255 }).notNull(),
  port: integer('port').default(22).notNull(),
  username: varchar('username', { length: 128 }).notNull(),
  authMethod: varchar('auth_method', { length: 20 }).notNull(),
  encryptedCredential: varchar('encrypted_credential', { length: 4096 }).notNull(),
  status: vpsStatusEnum('status').default('pending').notNull(),
  lastHealthCheck: timestamp('last_health_check'),
  provider: varchar('provider', { length: 64 }).default('other'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
