import type { FastifyInstance } from 'fastify';
import { createBotSchema, updateBotSchema, botConfigSchema } from '@openclaw/shared';
import * as botsService from './bots.service.js';

export async function botsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // List bots
  app.get('/', async (request) => {
    const { page, limit } = request.query as { page?: string; limit?: string };
    const result = await botsService.listBots(
      request.user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    return { success: true, ...result };
  });

  // Create bot
  app.post('/', async (request, reply) => {
    const input = createBotSchema.parse(request.body);
    const bot = await botsService.createBot(request.user.userId, input);
    return reply.status(201).send({ success: true, data: bot });
  });

  // Get bot
  app.get('/:botId', async (request) => {
    const { botId } = request.params as { botId: string };
    const bot = await botsService.getBot(request.user.userId, botId);
    return { success: true, data: bot };
  });

  // Update bot
  app.patch('/:botId', async (request) => {
    const { botId } = request.params as { botId: string };
    const input = updateBotSchema.parse(request.body);
    const bot = await botsService.updateBot(request.user.userId, botId, input);
    return { success: true, data: bot };
  });

  // Delete bot
  app.delete('/:botId', async (request, reply) => {
    const { botId } = request.params as { botId: string };
    await botsService.deleteBot(request.user.userId, botId);
    return reply.status(204).send();
  });

  // Get bot config
  app.get('/:botId/config', async (request) => {
    const { botId } = request.params as { botId: string };
    const config = await botsService.getBotConfig(request.user.userId, botId);
    return { success: true, data: config };
  });

  // Create/update bot config
  app.put('/:botId/config', async (request) => {
    const { botId } = request.params as { botId: string };
    const input = botConfigSchema.parse(request.body);
    const config = await botsService.upsertBotConfig(request.user.userId, botId, input);
    return { success: true, data: config };
  });

  // Deploy bot to VPS
  app.post('/:botId/deploy', async (request) => {
    const { botId } = request.params as { botId: string };
    const result = await botsService.deployBot(request.user.userId, botId);
    return { success: true, data: result };
  });

  // Start bot
  app.post('/:botId/start', async (request) => {
    const { botId } = request.params as { botId: string };
    const result = await botsService.startBot(request.user.userId, botId);
    return { success: true, data: result };
  });

  // Stop bot
  app.post('/:botId/stop', async (request) => {
    const { botId } = request.params as { botId: string };
    const result = await botsService.stopBot(request.user.userId, botId);
    return { success: true, data: result };
  });

  // Restart bot
  app.post('/:botId/restart', async (request) => {
    const { botId } = request.params as { botId: string };
    const result = await botsService.restartBot(request.user.userId, botId);
    return { success: true, data: result };
  });

  // Get bot status from VPS
  app.get('/:botId/status', async (request) => {
    const { botId } = request.params as { botId: string };
    const result = await botsService.getBotStatus(request.user.userId, botId);
    return { success: true, data: result };
  });

  // Get bot logs from VPS
  app.get('/:botId/logs', async (request) => {
    const { botId } = request.params as { botId: string };
    const { lines } = request.query as { lines?: string };
    const result = await botsService.getBotLogs(request.user.userId, botId, lines ? parseInt(lines) : 100);
    return { success: true, data: result };
  });
}
