import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

async function characterRoutes(app: FastifyInstance) {
  // Get all character definitions (static data)
  app.get('/', async (_request, reply) => {
    const characters = await prisma.character.findMany({
      include: { skill: true },
      orderBy: [{ rarity: 'desc' }, { name: 'asc' }],
    });

    return characters.map((c) => ({
      id: c.id,
      charId: c.charId,
      name: c.name,
      warlord: c.warlord,
      rarity: c.rarity,
      baseHp: c.baseHp,
      baseAtk: c.baseAtk,
      baseDef: c.baseDef,
      baseWis: c.baseWis,
      baseAgi: c.baseAgi,
      warlord: c.warlord,
      description: c.description,
      skill: c.skill
        ? { id: c.skill.id, name: c.skill.name, description: c.skill.description }
        : null,
    }));
  });

  // Get player's owned character instances
  app.get('/mine', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const instances = await prisma.characterInstance.findMany({
      where: { playerId },
      include: { character: { include: { skill: true } } },
      orderBy: [{ character: { rarity: 'desc' } }, { level: 'desc' }],
    });

    return instances.map((inst) => ({
      id: inst.id,
      characterId: inst.characterId,
      level: inst.level,
      exp: inst.exp,
      star: inst.star,
      skillLevel: inst.skillLevel,
      isInFormation: inst.isInFormation,
      character: {
        id: inst.character.id,
        charId: inst.character.charId,
        name: inst.character.name,
        warlord: inst.character.warlord,
        rarity: inst.character.rarity,
        baseHp: inst.character.baseHp,
        baseAtk: inst.character.baseAtk,
        baseDef: inst.character.baseDef,
        baseWis: inst.character.baseWis,
        baseAgi: inst.character.baseAgi,
        description: inst.character.description,
        skill: inst.character.skill
          ? { id: inst.character.skill.id, name: inst.character.skill.name, description: inst.character.skill.description }
          : null,
      },
    }));
  });

  // Level up a character (spend gold)
  app.post('/:instanceId/levelup', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const { instanceId } = request.params as { instanceId: string };
    const { levels } = request.body as { levels?: number };
    const numLevels = Math.max(1, Math.min(levels || 1, 10));

    const instance = await prisma.characterInstance.findFirst({
      where: { id: instanceId, playerId },
      include: { character: true },
    });
    if (!instance) return reply.code(404).send({ error: 'not_found', message: 'Character not found' });

    const newLevel = instance.level + numLevels;
    const cost = numLevels * 100;

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || player.gold < cost) {
      return reply.code(400).send({ error: 'insufficient_gold', message: 'Not enough gold' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.player.update({ where: { id: playerId }, data: { gold: { decrement: cost } } });
      return tx.characterInstance.update({
        where: { id: instanceId },
        data: { level: newLevel },
      });
    });

    return { success: true, newLevel: updated.level, goldSpent: cost };
  });
}

export default characterRoutes;
