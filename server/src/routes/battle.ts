import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { startBattleSchema } from '../schemas/index.js';
import { BattleEngine, BattleCharacter } from '../battle/engine.js';

async function battleRoutes(app: FastifyInstance) {
  // Start a battle
  app.post('/start', { preHandler: authenticate, schema: { body: startBattleSchema } }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const { stageId, formationId } = request.body as { stageId: string; formationId?: string };

    // Get stage
    const stage = await prisma.stage.findUnique({ where: { stageId } });
    if (!stage) return reply.code(404).send({ error: 'not_found', message: 'Stage not found' });

    // Check stamina
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return reply.code(404).send({ error: 'not_found', message: 'Player not found' });
    if (player.stamina < stage.staminaCost) {
      return reply.code(400).send({ error: 'insufficient_stamina', message: 'Not enough stamina' });
    }

    // Get formation
    let formation;
    if (formationId) {
      formation = await prisma.formation.findFirst({ where: { id: formationId, playerId } });
    } else {
      formation = await prisma.formation.findFirst({ where: { playerId, isDefault: true } });
    }
    if (!formation) return reply.code(404).send({ error: 'not_found', message: 'No formation found' });

    // Get character instances in formation
    const slotIds = [formation.slot1, formation.slot2, formation.slot3, formation.slot4, formation.slot5].filter(Boolean) as string[];
    if (slotIds.length === 0) {
      return reply.code(400).send({ error: 'validation', message: 'Formation is empty' });
    }

    const instances = await prisma.characterInstance.findMany({
      where: { id: { in: slotIds }, playerId },
      include: { character: { include: { skill: true } } },
    });

    if (instances.length !== slotIds.length) {
      return reply.code(400).send({ error: 'validation', message: 'Some characters in formation are invalid' });
    }

    // Build player team — read pre-computed stats directly
    const playerTeam: BattleCharacter[] = instances.map((inst) => ({
      id: inst.id,
      name: inst.character.name,
      faction: inst.character.faction as any,
      rarity: inst.character.rarity as any,
      level: inst.level,
      star: inst.star,
      skillLevel: inst.skillLevel,
      hp: inst.currentHp,
      atk: inst.currentAtk,
      def: inst.currentDef,
      wis: inst.currentWis,
      agi: inst.currentAgi,
      skills: inst.character.skill ? [inst.character.skill.skillId] : [],
    }));

    // Build enemy team from stage config
    const enemyConfig = stage.enemies as any[];
    const enemyTeam: BattleCharacter[] = enemyConfig.map((enemy, idx) => ({
      id: `enemy_${idx}`,
      name: enemy.name || `Enemy ${idx + 1}`,
      faction: enemy.faction || 'PURIST',
      rarity: enemy.rarity || 'N',
      level: enemy.level || 1,
      star: 1,
      skillLevel: 1,
      hp: enemy.hp || 500,
      atk: enemy.atk || 100,
      def: enemy.def || 50,
      wis: enemy.wis || 50,
      agi: enemy.agi || 80,
      skills: [],
    }));

    // Create battle record
    const battleId = `B-${Date.now().toString(36).toUpperCase()}`;
    const seed = Math.floor(Math.random() * 2147483647);

    const battle = await prisma.battle.create({
      data: {
        battleId,
        playerId,
        stageId,
        seed,
        engineVersion: '0.1.0',
        status: 'ONGOING',
      },
    });

    // Run battle engine
    const engine = new BattleEngine({
      seed,
      maxTurns: 50,
      engineVersion: '0.1.0',
      factionCounter: {},
    }, battleId);

    playerTeam.forEach((char, idx) => engine.addUnit(char, false, 0, idx));
    enemyTeam.forEach((char, idx) => engine.addUnit(char, true, 1, idx));

    const result = engine.runBattle();

    // Update battle record
    await prisma.battle.update({
      where: { id: battle.id },
      data: {
        status: result.status === 'victory' ? 'VICTORY' : 'DEFEAT',
        result: result.status === 'victory' ? 'VICTORY' : 'DEFEAT',
        turnCount: result.turnCount,
        durationMs: 0,
        rewards: result.rewards || {},
        log: result.events as any,
        completedAt: new Date(),
      },
    });

    // If victory, update progress and grant rewards
    if (result.status === 'victory' && result.rewards) {
      await prisma.$transaction(async (tx) => {
        // Deduct stamina
        await tx.player.update({
          where: { id: playerId },
          data: { stamina: { decrement: stage.staminaCost } },
        });

        // Grant exp and gold
        await tx.player.update({
          where: { id: playerId },
          data: {
            exp: { increment: result.rewards!.exp },
            gold: { increment: result.rewards!.gold },
          },
        });

        // Update stage progress
        const progress = await tx.playerProgress.findUnique({
          where: { playerId_stageId: { playerId, stageId } },
        });

        if (!progress) {
          await tx.playerProgress.create({
            data: {
              playerId,
              stageId,
              cleared: true,
              stars: 3,
              bestTimeMs: result.turnCount * 1000,
              firstClearAt: new Date(),
              attempts: 1,
            },
          });
        } else {
          await tx.playerProgress.update({
            where: { id: progress.id },
            data: {
              cleared: true,
              stars: Math.max(progress.stars, 3),
              attempts: { increment: 1 },
            },
          });
        }
      });
    }

    return {
      battleId: battle.battleId,
      status: result.status,
      turnCount: result.turnCount,
      events: result.events,
      rewards: result.rewards,
    };
  });

  // Get battle history
  app.get('/history', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const battles = await prisma.battle.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return battles.map((b) => ({
      battleId: b.battleId,
      stageId: b.stageId,
      status: b.status,
      result: b.result,
      turnCount: b.turnCount,
      rewards: b.rewards,
      createdAt: b.createdAt.toISOString(),
    }));
  });

  // Get battle replay
  app.get('/:battleId/replay', { preHandler: authenticate }, async (request, reply) => {
    const playerId = request.playerId;
    if (!playerId) return reply.code(401).send({ error: 'unauthorized' });

    const { battleId } = request.params as { battleId: string };
    const battle = await prisma.battle.findFirst({
      where: { battleId, playerId },
    });

    if (!battle) return reply.code(404).send({ error: 'not_found', message: 'Battle not found' });

    return {
      battleId: battle.battleId,
      seed: battle.seed,
      engineVersion: battle.engineVersion,
      status: battle.status,
      result: battle.result,
      turnCount: battle.turnCount,
      log: battle.log,
    };
  });
}

export default battleRoutes;
