import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema } from '@clawdeploy/shared';
import { registerUser, loginUser, getUserById, updateUser, changePassword } from './auth.service.js';
import { env } from '../../config/env.js';
import { createSigner, createVerifier } from 'fast-jwt';

const signRefresh = createSigner({ key: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRY });
const verifyRefresh = createVerifier({ key: env.JWT_REFRESH_SECRET });

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post('/register', async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const user = await registerUser(input);
    const accessToken = app.jwt.sign({ userId: user.id });
    const refreshToken = signRefresh({ userId: user.id });

    return reply.status(201).send({
      success: true,
      data: {
        user,
        tokens: { accessToken, refreshToken },
      },
    });
  });

  // Login
  app.post('/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await loginUser(input);
    const accessToken = app.jwt.sign({ userId: user.id });
    const refreshToken = signRefresh({ userId: user.id });

    return reply.send({
      success: true,
      data: {
        user,
        tokens: { accessToken, refreshToken },
      },
    });
  });

  // Refresh token
  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Refresh token is required' },
      });
    }

    try {
      const payload = verifyRefresh(refreshToken) as { userId: string };
      const accessToken = app.jwt.sign({ userId: payload.userId });
      const newRefreshToken = signRefresh({ userId: payload.userId });

      return reply.send({
        success: true,
        data: { accessToken, refreshToken: newRefreshToken },
      });
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' },
      });
    }
  });

  // Get current user
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await getUserById(request.user.userId);
    return { success: true, data: user };
  });

  // Update profile
  app.patch('/me', { preHandler: [app.authenticate] }, async (request) => {
    const input = updateProfileSchema.parse(request.body);
    const user = await updateUser(request.user.userId, input);
    return { success: true, data: user };
  });

  // Change password
  app.post('/change-password', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = changePasswordSchema.parse(request.body);
    await changePassword(request.user.userId, input.currentPassword, input.newPassword);
    return reply.send({ success: true, data: { message: 'Password changed' } });
  });
}
