import type { FastifyInstance, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

export const errorHandler = fp(async function (app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    const statusCode = 'statusCode' in error ? (error as FastifyError).statusCode : undefined;
    const code = 'code' in error ? (error as FastifyError).code : undefined;

    // Always log the full error
    request.log.error({
      err: error,
      statusCode: statusCode || 500,
      code,
      message: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    }, `[ERROR] ${request.method} ${request.url} -> ${statusCode || 500}: ${error.message}`);

    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.flatten().fieldErrors,
        },
      });
    }

    if (statusCode) {
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: code || 'ERROR',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  });
});
