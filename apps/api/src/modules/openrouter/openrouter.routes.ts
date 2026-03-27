import type { FastifyInstance } from 'fastify';
import * as openrouterService from './openrouter.service.js';

export async function openrouterRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // List available models (cached)
  app.get('/models', async () => {
    const models = await openrouterService.listModels();
    return { success: true, data: models };
  });

  // Validate an OpenRouter API key
  app.post('/validate-key', async (request) => {
    const { apiKey } = request.body as { apiKey: string };
    if (!apiKey) {
      throw Object.assign(new Error('apiKey is required'), { statusCode: 400 });
    }
    const result = await openrouterService.validateKey(apiKey);
    return { success: true, data: result };
  });

  // Get credits for a key
  app.post('/credits', async (request) => {
    const { apiKey } = request.body as { apiKey: string };
    if (!apiKey) {
      throw Object.assign(new Error('apiKey is required'), { statusCode: 400 });
    }
    const credits = await openrouterService.getCredits(apiKey);
    return { success: true, data: credits };
  });
}
