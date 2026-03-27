import type { OpenClawConfig } from '@openclaw/shared';

export interface GenerateConfigParams {
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

function escapeTomlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Generate config.toml for ZeroClaw gateway.
 * Mounted at /zeroclaw-data/.zeroclaw/config.toml inside the container.
 * Reference: https://github.com/zeroclaw-labs/zeroclaw/wiki/04.1-Configuration-File-Reference
 */
export function generateConfigToml(params: GenerateConfigParams): string {
  // Minimal config matching known-working ZeroClaw format.
  // Extra sections ([gateway], [autonomy], etc.) break silent serde deserialization.
  // api_key, gateway port, etc. are passed via env vars in docker-compose.
  let toml = `default_provider = "openrouter"\n`;
  toml += `default_model = "${escapeTomlString(params.primaryModel)}"\n`;
  toml += '\n';

  if (params.telegramBotToken) {
    toml += '[channels_config.telegram]\n';
    toml += `bot_token = "${escapeTomlString(params.telegramBotToken)}"\n`;
    if (params.telegramAllowedUsers?.length) {
      const users = params.telegramAllowedUsers.map(u => `"${escapeTomlString(u)}"`).join(', ');
      toml += `allowed_users = [${users}]\n`;
    }
    toml += '\n';
  }

  return toml;
}

/**
 * Generate JSON config object for DB storage / display.
 */
export function generateOpenclawConfig(params: GenerateConfigParams): OpenClawConfig {
  const config: OpenClawConfig = {
    env: {
      OPENROUTER_API_KEY: params.openrouterKey,
    },
    agents: {
      defaults: {
        model: {
          primary: params.primaryModel,
        },
      },
    },
  };

  if (params.fallbackModel) {
    config.agents.defaults.model.fallback = params.fallbackModel;
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
