import type { FastifyInstance } from 'fastify';
import * as billingService from './billing.service.js';
import type { Plan } from '@clawdeploy/shared';

export async function billingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/subscription', async (request) => {
    const data = await billingService.getSubscription(request.user.userId);
    return { success: true, data };
  });

  app.post('/subscribe', async (request) => {
    const { plan } = request.body as { plan: Plan };
    if (!['free', 'starter', 'pro', 'enterprise'].includes(plan)) {
      throw Object.assign(new Error('Invalid plan'), { statusCode: 400 });
    }
    const data = await billingService.changePlan(request.user.userId, plan);
    return { success: true, data };
  });

  app.post('/cancel', async (request) => {
    const data = await billingService.cancelSubscription(request.user.userId);
    return { success: true, data };
  });
}
