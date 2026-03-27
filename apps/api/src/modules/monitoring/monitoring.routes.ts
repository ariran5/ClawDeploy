import type { FastifyInstance } from 'fastify';
import * as monitoringService from './monitoring.service.js';

export async function monitoringRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/dashboard', async (request) => {
    const data = await monitoringService.getDashboardSummary(request.user.userId);
    return { success: true, data };
  });

  app.get('/usage', async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const data = await monitoringService.getUsageSummary(
      request.user.userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    return { success: true, data };
  });

  app.get('/usage/:botId', async (request) => {
    const { botId } = request.params as { botId: string };
    const { from, to } = request.query as { from?: string; to?: string };
    const data = await monitoringService.getBotUsage(
      request.user.userId,
      botId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    return { success: true, data };
  });

  app.get('/costs', async (request) => {
    const { days } = request.query as { days?: string };
    const data = await monitoringService.getDailyCosts(
      request.user.userId,
      days ? parseInt(days) : 30,
    );
    return { success: true, data };
  });

  app.get('/messages/:botId', async (request) => {
    const { botId } = request.params as { botId: string };
    const { page, limit } = request.query as { page?: string; limit?: string };
    const data = await monitoringService.getMessageLog(
      request.user.userId,
      botId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
    return { success: true, ...data };
  });
}
