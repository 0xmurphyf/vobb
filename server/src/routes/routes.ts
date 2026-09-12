import { FastifyInstance } from 'fastify';

export async function userRoutes(app: FastifyInstance) {
  app.get('/me', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.get('/me/stamina', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.post('/me/stamina/refill', async (req, reply) => reply.send({ status: 'not_implemented' }));
}

export async function gachaRoutes(app: FastifyInstance) {
  app.get('/pools', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.post('/pull', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.post('/pull10', async (req, reply) => reply.send({ status: 'not_implemented' }));
}

export async function battleRoutes(app: FastifyInstance) {
  app.post('/pve/start', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.post('/pve/end', async (req, reply) => reply.send({ status: 'not_implemented' }));
}

export async function characterRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.get('/:id', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.post('/:id/levelup', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.post('/:id/starup', async (req, reply) => reply.send({ status: 'not_implemented' }));
}

export async function teamRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.put('/:id', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.post('/:id/set-default', async (req, reply) => reply.send({ status: 'not_implemented' }));
}

export async function pvpRoutes(app: FastifyInstance) {
  app.get('/season', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.get('/leaderboard', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.post('/attack', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.get('/defense', async (req, reply) => reply.send({ status: 'not_implemented' }));
}

export async function stageRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => reply.send({ status: 'not_implemented' }));
  app.get('/:id', async (req, reply) => reply.send({ status: 'not_implemented' }));
}
