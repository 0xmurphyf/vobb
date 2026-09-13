import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

async function playerRoutes(app: FastifyInstance) {
  // Get current player profile
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        familiarInstances: {
          include: { familiar: { include: { skill: true } } },
        },
        formations: true,
        currencies: true,
        inventory: true,
      },
    });

    if (!player) return reply.code(404).send({ error: 'not_found', message: 'Player not found' });

    return {
      id: player.id,
      name: player.name,
      level: player.level,
      exp: player.exp,
      stamina: player.stamina,
      staminaMax: player.staminaMax,
      staminaRegenAt: player.staminaRegenAt,
      tutorialStep: player.tutorialStep,
      characters: player.familiarInstances,
      formations: player.formations,
      currencies: player.currencies,
      inventory: player.inventory,
    };
  });

  // Update player name
  app.patch('/me', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const { name } = request.body as { name?: string };
    if (!name || name.length < 1 || name.length > 32) {
      return reply.code(400).send({ error: 'validation', message: 'Name must be 1-32 characters' });
    }

    await prisma.player.update({ where: { id: playerId }, data: { name } });
    return { success: true };
  });

  // Get player progress (cleared stages)
  app.get('/progress', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const progress = await prisma.playerProgress.findMany({
      where: { playerId },
      include: { stage: true },
    });

    return progress.map((p) => ({
      stageId: p.stageId,
      cleared: p.cleared,
      stars: p.stars,
      bestTimeMs: p.bestTimeMs,
      firstClearAt: p.firstClearAt?.toISOString() ?? null,
      attempts: p.attempts,
    }));
  });
}

export default playerRoutes;
