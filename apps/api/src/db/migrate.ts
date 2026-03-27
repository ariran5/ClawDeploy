import { sql } from 'drizzle-orm';
import { db } from './index.js';
import * as schema from './schema/index.js';

export async function runMigrations() {
  console.log('Running database migrations...');

  // Create enums
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE vps_status AS ENUM ('pending', 'connecting', 'active', 'unreachable', 'error');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE bot_status AS ENUM ('draft', 'configured', 'deploying', 'running', 'stopped', 'error');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      avatar_url VARCHAR(512),
      is_active BOOLEAN NOT NULL DEFAULT true,
      email_verified BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vps_servers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      host VARCHAR(255) NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      username VARCHAR(128) NOT NULL,
      auth_method VARCHAR(20) NOT NULL,
      encrypted_credential VARCHAR(4096) NOT NULL,
      status vps_status NOT NULL DEFAULT 'pending',
      last_health_check TIMESTAMP,
      provider VARCHAR(64) DEFAULT 'other',
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vps_id UUID REFERENCES vps_servers(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      description VARCHAR(1024),
      status bot_status NOT NULL DEFAULT 'draft',
      is_active BOOLEAN NOT NULL DEFAULT false,
      last_error VARCHAR(2048),
      openclaw_config JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bot_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bot_id UUID NOT NULL UNIQUE REFERENCES bots(id) ON DELETE CASCADE,
      encrypted_openrouter_key VARCHAR(4096),
      primary_model VARCHAR(255) NOT NULL,
      fallback_model VARCHAR(255),
      max_tokens_per_request INTEGER DEFAULT 4096,
      max_tokens_per_day INTEGER,
      temperature VARCHAR(10) DEFAULT '0.7',
      system_prompt VARCHAR(16384),
      agent_settings JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS telegram_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bot_id UUID NOT NULL UNIQUE REFERENCES bots(id) ON DELETE CASCADE,
      encrypted_bot_token VARCHAR(4096) NOT NULL,
      telegram_bot_id BIGINT,
      telegram_username VARCHAR(255),
      bot_name VARCHAR(255),
      allowed_users JSONB,
      is_verified BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT false,
      last_verified_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      model VARCHAR(255) NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      cached_tokens INTEGER DEFAULT 0,
      cost NUMERIC(12,8) NOT NULL,
      telegram_chat_id VARCHAR(64),
      telegram_user_id VARCHAR(64),
      message_preview VARCHAR(512),
      response_preview VARCHAR(512),
      generation_id VARCHAR(255),
      duration_ms INTEGER,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS usage_logs_bot_created_idx ON usage_logs(bot_id, created_at DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS usage_logs_bot_model_idx ON usage_logs(bot_id, model)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      key_prefix VARCHAR(12) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_used_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      plan plan NOT NULL DEFAULT 'free',
      status subscription_status NOT NULL DEFAULT 'active',
      max_bots INTEGER NOT NULL DEFAULT 1,
      max_vps_servers INTEGER NOT NULL DEFAULT 1,
      external_id VARCHAR(255),
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  // Incremental migrations for existing databases
  await db.execute(sql`
    ALTER TABLE telegram_connections ADD COLUMN IF NOT EXISTS allowed_users JSONB
  `);

  console.log('Database migrations completed.');
}
