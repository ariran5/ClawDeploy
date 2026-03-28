import { readFileSync } from 'fs';
import { resolve } from 'path';

interface PlanConfig {
  maxBots: number;
  maxVpsServers: number;
  price: number;
}

interface ClawDeployConfig {
  plans: Record<string, PlanConfig>;
  defaultPlan: string;
  deploy: {
    remoteDir: string;
    dockerImage: string;
    sshTimeoutMs: number;
    containerMemoryLimit: string;
    containerCpuLimit: string;
  };
  openrouter: {
    baseUrl: string;
  };
}

function loadConfig(): ClawDeployConfig {
  const defaults: ClawDeployConfig = {
    plans: {
      free: { maxBots: 1000, maxVpsServers: 100, price: 0 },
    },
    defaultPlan: 'free',
    deploy: {
      remoteDir: '/opt/clawdeploy',
      dockerImage: 'ghcr.io/zeroclaw-labs/zeroclaw:latest',
      sshTimeoutMs: 30000,
      containerMemoryLimit: '128M',
      containerCpuLimit: '0.5',
    },
    openrouter: {
      baseUrl: 'https://openrouter.ai/api/v1',
    },
  };

  try {
    // Look for clawdeploy.json in project root (3 levels up from dist/config/)
    const configPath = resolve(process.cwd(), 'clawdeploy.json');
    const raw = readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(raw);

    return {
      plans: userConfig.plans ?? defaults.plans,
      defaultPlan: userConfig.defaultPlan ?? defaults.defaultPlan,
      deploy: { ...defaults.deploy, ...userConfig.deploy },
      openrouter: { ...defaults.openrouter, ...userConfig.openrouter },
    };
  } catch {
    console.log('[config] No clawdeploy.json found, using defaults');
    return defaults;
  }
}

export const config = loadConfig();

export const PLAN_LIMITS = config.plans;
export const DEFAULT_PLAN = config.defaultPlan;
export const OPENROUTER_BASE_URL = config.openrouter.baseUrl;
export const OPENCLAW_DEPLOY_DIR = config.deploy.remoteDir;
export const DOCKER_IMAGE = config.deploy.dockerImage;
export const SSH_TIMEOUT_MS = config.deploy.sshTimeoutMs;
export const CONTAINER_MEMORY_LIMIT = config.deploy.containerMemoryLimit;
export const CONTAINER_CPU_LIMIT = config.deploy.containerCpuLimit;
