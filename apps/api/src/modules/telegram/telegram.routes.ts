import type { FastifyInstance } from 'fastify';
import { telegramTokenSchema } from '@clawdeploy/shared';
import * as telegramService from './telegram.service.js';
import * as botsService from '../bots/bots.service.js';

export async function telegramRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // Get telegram connection for a bot
  app.get('/bots/:botId', async (request) => {
    const { botId } = request.params as { botId: string };
    await botsService.getBot(request.user.userId, botId);
    const conn = await telegramService.getTelegramConnection(botId);
    return { success: true, data: conn };
  });

  // Set telegram token + allowed users
  app.put('/bots/:botId', async (request) => {
    const { botId } = request.params as { botId: string };
    await botsService.getBot(request.user.userId, botId);
    const { botToken, allowedUsers } = telegramTokenSchema.parse(request.body);
    const result = await telegramService.setTelegramToken(botId, botToken, allowedUsers);
    return { success: true, data: result };
  });

  // Update allowed users only
  app.patch('/bots/:botId/allowed-users', async (request) => {
    const { botId } = request.params as { botId: string };
    await botsService.getBot(request.user.userId, botId);
    const { allowedUsers } = request.body as { allowedUsers: string[] };
    await telegramService.updateAllowedUsers(botId, allowedUsers);
    return { success: true, data: { allowedUsers } };
  });

  // Remove telegram connection
  app.delete('/bots/:botId', async (request, reply) => {
    const { botId } = request.params as { botId: string };
    await botsService.getBot(request.user.userId, botId);
    await telegramService.removeTelegramConnection(botId);
    return reply.status(204).send();
  });

  // Verify telegram token (without saving)
  app.post('/verify', async (request) => {
    const { botToken } = telegramTokenSchema.parse(request.body);
    const info = await telegramService.verifyTelegramToken(botToken);
    return { success: true, data: info };
  });
}
