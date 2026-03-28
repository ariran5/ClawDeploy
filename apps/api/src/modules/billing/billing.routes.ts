import type { FastifyInstance } from 'fastify';
import * as billingService from './billing.service.js';
import { PLAN_LIMITS } from '../../config/constants.js';
import type { Plan } from '@clawdeploy/shared';

export async function billingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // Get current subscription
  app.get('/subscription', async (request) => {
    const data = await billingService.getSubscription(request.user.userId);
    return { success: true, data };
  });

  // Get available plans (from clawdeploy.json)
  app.get('/plans', async () => {
    return { success: true, data: PLAN_LIMITS };
  });

  // Change plan
  app.post('/subscribe', async (request) => {
    const { plan } = request.body as { plan: Plan };
    if (!PLAN_LIMITS[plan]) {
      throw Object.assign(new Error(`Plan "${plan}" is not available`), { statusCode: 400 });
    }
    const data = await billingService.changePlan(request.user.userId, plan);
    return { success: true, data };
  });

  // Cancel subscription
  app.post('/cancel', async (request) => {
    const data = await billingService.cancelSubscription(request.user.userId);
    return { success: true, data };
  });
}
