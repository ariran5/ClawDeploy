export const PLAN_LIMITS = {
  free: { maxBots: 1, maxVpsServers: 1 },
  starter: { maxBots: 5, maxVpsServers: 3 },
  pro: { maxBots: 20, maxVpsServers: 10 },
  enterprise: { maxBots: 100, maxVpsServers: 50 },
} as const;

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const OPENCLAW_DEPLOY_DIR = '/opt/clawdeploy';
