import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authPlugin } from './plugins/auth.js';
import { errorHandler } from './plugins/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { botsRoutes } from './modules/bots/bots.routes.js';
import { vpsRoutes } from './modules/vps/vps.routes.js';
import { telegramRoutes } from './modules/telegram/telegram.routes.js';
import { openrouterRoutes } from './modules/openrouter/openrouter.routes.js';
import { monitoringRoutes } from './modules/monitoring/monitoring.routes.js';
import { billingRoutes } from './modules/billing/billing.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: 'info',
    },
  });

  // Allow empty JSON body for action endpoints (deploy, start, stop, etc.)
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      const str = (body as string || '').trim();
      done(null, str ? JSON.parse(str) : {});
    } catch (err: any) {
      done(err, undefined);
    }
  });

  // Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(errorHandler);
  await app.register(authPlugin);

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(botsRoutes, { prefix: '/api/bots' });
  await app.register(vpsRoutes, { prefix: '/api/vps' });
  await app.register(telegramRoutes, { prefix: '/api/telegram' });
  await app.register(openrouterRoutes, { prefix: '/api/openrouter' });
  await app.register(monitoringRoutes, { prefix: '/api/monitoring' });
  await app.register(billingRoutes, { prefix: '/api/billing' });

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}
