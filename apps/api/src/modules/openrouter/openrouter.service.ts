import { OPENROUTER_BASE_URL } from '../../config/constants.js';

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  top_provider: {
    max_completion_tokens: number;
  };
}

interface OpenRouterCredits {
  total_credits: number;
  total_usage: number;
}

// Simple in-memory cache
let modelsCache: { data: OpenRouterModel[]; timestamp: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function listModels(): Promise<OpenRouterModel[]> {
  if (modelsCache && Date.now() - modelsCache.timestamp < CACHE_TTL) {
    return modelsCache.data;
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/models`);
  const data = await response.json() as { data: OpenRouterModel[] };

  modelsCache = { data: data.data, timestamp: Date.now() };
  return data.data;
}

export async function validateKey(apiKey: string): Promise<{ valid: boolean; credits?: OpenRouterCredits }> {
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/auth/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json() as { data: OpenRouterCredits };
    return { valid: true, credits: data.data };
  } catch {
    return { valid: false };
  }
}

export async function getCredits(apiKey: string): Promise<OpenRouterCredits> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/auth/key`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch credits'), { statusCode: 400 });
  }

  const data = await response.json() as { data: OpenRouterCredits };
  return data.data;
}
