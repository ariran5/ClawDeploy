import type { OpenClawConfig } from '@openclaw/shared';

interface GenerateConfigParams {
  openrouterKey: string;
  primaryModel: string;
  fallbackModel?: string | null;
  telegramBotToken?: string | null;
  telegramAllowedUsers?: string[] | null;
  maxTokensPerRequest?: number | null;
  maxTokensPerDay?: number | null;
  systemPrompt?: string | null;
  agentSettings?: Record<string, unknown> | null;
}

export function generateOpenclawConfig(params: GenerateConfigParams): OpenClawConfig {
  const config: OpenClawConfig = {
    env: {
      OPENROUTER_API_KEY: params.openrouterKey,
    },
    agents: {
      defaults: {
        model: {
          primary: `openrouter/${params.primaryModel}`,
        },
      },
    },
  };

  if (params.fallbackModel) {
    config.agents.defaults.model.fallback = `openrouter/${params.fallbackModel}`;
  }

  if (params.telegramBotToken) {
    config.telegram = {
      botToken: params.telegramBotToken,
    };
    if (params.telegramAllowedUsers?.length) {
      config.telegram.allowedUsers = params.telegramAllowedUsers;
    }
  }

  if (params.maxTokensPerRequest || params.maxTokensPerDay) {
    config.limits = {};
    if (params.maxTokensPerRequest) {
      config.limits.maxTokensPerRequest = params.maxTokensPerRequest;
    }
    if (params.maxTokensPerDay) {
      config.limits.maxTokensPerDay = params.maxTokensPerDay;
    }
  }

  return config;
}
