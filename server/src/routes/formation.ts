import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { updateFormationSchema } from '../schemas.js';

async function formationRoutes(app: FastifyInstance) {
  // Get player's formations
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const formations = await prisma.formation.findMany({
      where: { playerId },
      orderBy: { createdAt: 'asc' },
    });

    return formations;
  });

  // Create a new formation
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const body = request.body as { name?: string; slots?: (string | null)[]; isDefault?: boolean };
    const name = body.name || 'New Formation';
    const slots = body.slots || [null, null, null, null, null];

    // Validate slots length
    if (slots.length !== 5) {
      return reply.code(400).send({ error: 'validation', message: 'Formation must have exactly 5 slots' });
    }

    // Verify all character instances belong to player
    const instanceIds = slots.filter((s): s is string => s !== null);
    if (instanceIds.length > 0) {
      const owned = await prisma.characterInstance.findMany({
        where: { id: { in: instanceIds }, playerId },
      });
      if (owned.length !== instanceIds.length) {
        return reply.code(403).send({ error: 'forbidden', message: 'Some characters do not belong to you' });
      }
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await prisma.formation.updateMany({
        where: { playerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const formation = await prisma.formation.create({
      data: {
        playerId,
        name,
        slot1: slots[0],
        slot2: slots[1],
        slot3: slots[2],
        slot4: slots[3],
        slot5: slots[4],
        isDefault: body.isDefault || false,
      },
    });

    return formation;
  });

  // Update a formation
  app.patch('/:id', { preHandler: authenticate, schema: { body: updateFormationSchema } }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; slots?: (string | null)[]; isDefault?: boolean };

    const formation = await prisma.formation.findFirst({ where: { id, playerId } });
    if (!formation) return reply.code(404).send({ error: 'not_found', message: 'Formation not found' });

    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;

    if (body.slots) {
      if (body.slots.length !== 5) {
        return reply.code(400).send({ error: 'validation', message: 'Formation must have exactly 5 slots' });
      }
      const instanceIds = body.slots.filter((s): s is string => s !== null);
      if (instanceIds.length > 0) {
        const owned = await prisma.characterInstance.findMany({
          where: { id: { in: instanceIds }, playerId },
        });
        if (owned.length !== instanceIds.length) {
          return reply.code(403).send({ error: 'forbidden', message: 'Some characters do not belong to you' });
        }
      }
      updateData.slot1 = body.slots[0];
      updateData.slot2 = body.slots[1];
      updateData.slot3 = body.slots[2];
      updateData.slot4 = body.slots[3];
      updateData.slot5 = body.slots[4];
    }

    if (body.isDefault) {
      await prisma.formation.updateMany({
        where: { playerId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    }

    const updated = await prisma.formation.update({ where: { id }, data: updateData });
    return updated;
  });

  // Delete a formation
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const { id } = request.params as { id: string };
    const formation = await prisma.formation.findFirst({ where: { id, playerId } });
    if (!formation) return reply.code(404).send({ error: 'not_found', message: 'Formation not found' });

    await prisma.formation.delete({ where: { id } });
    return { success: true };
  });
}

export default formationRoutes;
