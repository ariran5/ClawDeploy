export type BotStatus = 'draft' | 'configured' | 'deploying' | 'running' | 'stopped' | 'error';

export interface Bot {
  id: string;
  userId: string;
  vpsId: string | null;
  name: string;
  description: string | null;
  status: BotStatus;
  isActive: boolean;
  lastError: string | null;
  openclawConfig: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BotConfig {
  id: string;
  botId: string;
  primaryModel: string;
  fallbackModel: string | null;
  maxTokensPerRequest: number;
  maxTokensPerDay: number | null;
  temperature: string;
  systemPrompt: string | null;
  agentSettings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramConnection {
  id: string;
  botId: string;
  telegramBotId: number | null;
  telegramUsername: string | null;
  botName: string | null;
  isVerified: boolean;
  isActive: boolean;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpenClawConfig {
  env: {
    OPENROUTER_API_KEY: string;
  };
  agents: {
    defaults: {
      model: {
        primary: string;
        fallback?: string;
      };
    };
  };
  telegram?: {
    botToken: string;
    allowedUsers?: string[];
  };
  limits?: {
    maxTokensPerRequest?: number;
    maxTokensPerDay?: number;
  };
}
