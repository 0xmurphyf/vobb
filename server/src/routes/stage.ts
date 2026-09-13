import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

async function stageRoutes(app: FastifyInstance) {
  // Get all stages
  app.get('/', async (_request, reply) => {
    const stages = await prisma.stage.findMany({
      orderBy: [{ chapter: 'asc' }, { number: 'asc' }],
    });

    return stages.map((s) => ({
      stageId: s.stageId,
      chapter: s.chapter,
      number: s.number,
      name: s.name,
      staminaCost: s.staminaCost,
      enemies: s.enemies,
      rewards: s.rewards,
    }));
  });

  // Get stage details
  app.get('/:stageId', async (request, reply) => {
    const { stageId } = request.params as { stageId: string };
    const stage = await prisma.stage.findUnique({ where: { stageId } });
    if (!stage) return reply.code(404).send({ error: 'not_found', message: 'Stage not found' });

    return stage;
  });
}

export default stageRoutes;
