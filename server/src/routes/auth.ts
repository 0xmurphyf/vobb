// Routes will be implemented in Phase 1
import { FastifyInstance } from 'fastify';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (req, reply) => {
    reply.send({ status: 'not_implemented' });
  });
  app.post('/login', async (req, reply) => {
    reply.send({ status: 'not_implemented' });
  });
  app.post('/guest', async (req, reply) => {
    reply.send({ status: 'not_implemented' });
  });
}
