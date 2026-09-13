import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { gachaPullSchema } from '../schemas.js';

// Deterministic RNG (Mulberry32)
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function gachaRoutes(app: FastifyInstance) {
  // Get active gacha pools
  app.get('/', async () => {
    const pools = await prisma.gachaPool.findMany({
      where: { active: true },
      include: {
        items: {
          include: { character: true },
        },
      },
    });

    return pools.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      startsAt: p.startsAt.toISOString(),
      endsAt: p.endsAt?.toISOString() ?? null,
      items: p.items.map((item) => ({
        characterId: item.characterId,
        characterName: item.character.name,
        rarity: item.character.rarity,
        faction: item.character.faction,
        evolution: item.character.evolution,
        baseHp: item.character.baseHp,
        baseAtk: item.character.baseAtk,
        baseDef: item.character.baseDef,
        baseWis: item.character.baseWis,
        baseAgi: item.character.baseAgi,
        weight: item.weight,
        guaranteedSr: item.guaranteedSr,
      })),
    }));
  });

  // Get player's pity counter
  app.get('/pity', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const pity = await prisma.pityCounter.findUnique({ where: { playerId } });
    return {
      count: pity?.count ?? 0,
      guaranteedSr: pity?.guaranteedSr ?? 10,
      guaranteedSsr: pity?.guaranteedSsr ?? 100,
    };
  });

  // Perform a gacha pull
  app.post('/pull', { preHandler: authenticate, schema: { body: gachaPullSchema } }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const { poolId, pullType } = request.body as { poolId: string; pullType: 'single' | 'multi' };
    const pullCount = pullType === 'multi' ? 10 : 1;

    // Get pool with items
    const pool = await prisma.gachaPool.findUnique({
      where: { id: poolId },
      include: { items: { include: { character: { include: { skill: true, passive: true } } } } },
    });
    if (!pool || !pool.active) {
      return reply.code(404).send({ error: 'not_found', message: 'Gacha pool not found or inactive' });
    }

    // Check player gems
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return reply.code(404).send({ error: 'player_not_found' });

    const cost = pullType === 'multi' ? 2700 : 300;
    if (player.gems < cost) {
      return reply.code(400).send({ error: 'insufficient_gems', message: 'Not enough gems' });
    }

    // Get or create pity counter
    let pity = await prisma.pityCounter.findUnique({ where: { playerId } });
    if (!pity) {
      pity = await prisma.pityCounter.create({
        data: { playerId, count: 0, guaranteedSr: 10, guaranteedSsr: 100 },
      });
    }

    // Perform pulls
    const results: any[] = [];
    const seed = Date.now() ^ (playerId.charCodeAt(0) * 1000);
    const rng = mulberry32(seed);

    for (let i = 0; i < pullCount; i++) {
      pity.count++;

      let selectedRarity: string;
      let selectedItem: any;

      // Pity logic: guaranteed SR at threshold, SSR at higher threshold
      if (pity.count >= pity.guaranteedSsr) {
        selectedRarity = 'SSR';
        const ssrItems = pool.items.filter((item) => item.character.rarity === 'SSR');
        selectedItem = ssrItems[Math.floor(rng() * ssrItems.length)] || pool.items[0];
      } else if (pity.count >= pity.guaranteedSr) {
        selectedRarity = 'SR';
        const srItems = pool.items.filter((item) => item.character.rarity === 'SR');
        selectedItem = srItems[Math.floor(rng() * srItems.length)] || pool.items[0];
      } else {
        // Normal pull with weighted random
        const totalWeight = pool.items.reduce((sum, item) => sum + item.weight, 0);
        let roll = rng() * totalWeight;
        selectedItem = pool.items[0];
        for (const item of pool.items) {
          roll -= item.weight;
          if (roll <= 0) {
            selectedItem = item;
            break;
          }
        }
        selectedRarity = selectedItem.character.rarity;
      }

      // Reset pity if SSR pulled
      if (selectedRarity === 'SSR') {
        pity.count = 0;
      }

      // Create character instance for player (compute stats at level 1, star 1)
      const instance = await prisma.characterInstance.create({
        data: {
          playerId,
          characterId: selectedItem.characterId,
          level: 1,
          exp: 0,
          star: 1,
          skillLevel: 1,
          currentHp: selectedItem.character.baseHp,
          currentAtk: selectedItem.character.baseAtk,
          currentDef: selectedItem.character.baseDef,
          currentWis: selectedItem.character.baseWis,
          currentAgi: selectedItem.character.baseAgi,
        },
        include: { character: { include: { skill: true, passive: true } } },
      });

      results.push({
        instanceId: instance.id,
        characterId: instance.characterId,
        name: instance.character.name,
        faction: instance.character.faction,
        rarity: instance.character.rarity,
        gender: instance.character.gender,
        evolution: instance.character.evolution,
        level: instance.level,
        star: instance.star,
        currentHp: instance.currentHp,
        currentAtk: instance.currentAtk,
        currentDef: instance.currentDef,
        currentWis: instance.currentWis,
        currentAgi: instance.currentAgi,
        totalExp: instance.character.totalExp,
        description: instance.character.description,
        skill: instance.character.skill
          ? { id: instance.character.skill.id, name: instance.character.skill.name, description: instance.character.skill.description, effects: instance.character.skill.effects }
          : null,
        passive: instance.character.passive
          ? { id: instance.character.passive.id, name: instance.character.passive.name, description: instance.character.passive.description, effects: instance.character.passive.effects }
          : null,
      });
    }

    // Update pity counter and deduct gems
    await prisma.$transaction([
      prisma.pityCounter.update({
        where: { playerId },
        data: { count: pity.count, lastPullAt: new Date() },
      }),
      prisma.player.update({
        where: { id: playerId },
        data: { gems: { decrement: cost } },
      }),
    ]);

    return {
      results,
      gemsSpent: cost,
      newPityCount: pity.count,
    };
  });

  // Get gacha history
  app.get('/history', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const history = await prisma.gachaHistory.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return history.map((h) => ({
      id: h.id,
      characterId: h.characterId,
      rarity: h.rarity,
      pityCount: h.pityCount,
      createdAt: h.createdAt.toISOString(),
    }));
  });
}

export default gachaRoutes;
