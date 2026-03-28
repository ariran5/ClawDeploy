export type Plan = 'free' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  maxBots: number;
  maxVpsServers: number;
  externalId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsageLog {
  id: string;
  botId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: string;
  telegramChatId: string | null;
  messagePreview: string | null;
  responsePreview: string | null;
  generationId: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface UsageSummary {
  totalTokens: number;
  totalCost: string;
  messageCount: number;
  period: string;
}
