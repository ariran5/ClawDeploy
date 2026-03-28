import type { FastifyInstance } from 'fastify';
import { createVpsSchema, updateVpsSchema } from '@clawdeploy/shared';
import * as vpsService from './vps.service.js';

export async function vpsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const data = await vpsService.listVps(request.user.userId);
    return { success: true, data };
  });

  app.post('/', async (request, reply) => {
    const input = createVpsSchema.parse(request.body);
    const vps = await vpsService.createVps(request.user.userId, input);
    return reply.status(201).send({ success: true, data: vps });
  });

  app.get('/:vpsId', async (request) => {
    const { vpsId } = request.params as { vpsId: string };
    const vps = await vpsService.getVps(request.user.userId, vpsId);
    return { success: true, data: vps };
  });

  app.patch('/:vpsId', async (request) => {
    const { vpsId } = request.params as { vpsId: string };
    const input = updateVpsSchema.parse(request.body);
    const vps = await vpsService.updateVps(request.user.userId, vpsId, input);
    return { success: true, data: vps };
  });

  app.delete('/:vpsId', async (request, reply) => {
    const { vpsId } = request.params as { vpsId: string };
    await vpsService.deleteVps(request.user.userId, vpsId);
    return reply.status(204).send();
  });

  app.post('/:vpsId/test', async (request) => {
    const { vpsId } = request.params as { vpsId: string };
    const result = await vpsService.testVpsConnection(request.user.userId, vpsId);
    return { success: true, data: result };
  });

  app.get('/:vpsId/health', async (request) => {
    const { vpsId } = request.params as { vpsId: string };
    const health = await vpsService.getVpsHealth(request.user.userId, vpsId);
    return { success: true, data: health };
  });
}
