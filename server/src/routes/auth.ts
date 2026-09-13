import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { guestLoginSchema, registerSchema, refreshSchema } from '../schemas/index.js';

async function authRoutes(app: FastifyInstance) {
  // Guest login — creates a new guest account
  app.post('/guest', { schema: { body: guestLoginSchema } }, async (request, reply) => {
    const { playerName } = request.body as { playerName?: string };

    const user = await prisma.user.create({
      data: {
        username: `guest_${Date.now().toString(36)}`,
        guest: true,
        player: {
          create: {
            name: playerName || 'Hunter',
            currencies: {
              create: [
                { type: 'gold', amount: 1000 },
                { type: 'gems', amount: 50 },
                { type: 'stamina', amount: 100 },
              ],
            },
          },
        },
      },
      include: { player: true },
    });

    // Give guest 5 starter characters (one per faction, stars 1/2/3/1/2)
    const starterChars = await prisma.character.findMany({
      where: { charId: { in: ['adaptive_stalker', 'steadfast', 'fungal_lurker', 'void_pearl', 'chrome_reaper'] } },
      include: { growth: true },
    });

    const STARTER_LEVEL = 10;
    const STAR_VALUES = [1, 2, 3, 1, 2]; // 1-3 stars each
    for (let i = 0; i < starterChars.length; i++) {
      const char = starterChars[i];
      const star = STAR_VALUES[i] || 1;
      const starMult = 1 + (star - 1) * 0.1;
      const g = char.growth ? char.growth.statMultipliers as any : null;
      const growth = g || { hp: 0.10, atk: 0.10, def: 0.08, wis: 0.08, agi: 0.08 };
      await prisma.characterInstance.create({
        data: {
          playerId: user.player!.id,
          characterId: char.id,
          level: STARTER_LEVEL,
          exp: 0,
          star: star,
          skillLevel: star + 1,
          isInFormation: true,
          currentHp: Math.round(char.baseHp * (1 + (STARTER_LEVEL - 1) * growth.hp) * starMult),
          currentAtk: Math.round(char.baseAtk * (1 + (STARTER_LEVEL - 1) * growth.atk) * starMult),
          currentDef: Math.round(char.baseDef * (1 + (STARTER_LEVEL - 1) * growth.def) * starMult),
          currentWis: Math.round(char.baseWis * (1 + (STARTER_LEVEL - 1) * growth.wis) * starMult),
          currentAgi: Math.round(char.baseAgi * (1 + (STARTER_LEVEL - 1) * growth.agi) * starMult),
        },
      });
    }

    const accessToken = app.jwt.sign({ userId: user.id, playerId: user.player?.id }, { expiresIn: '15m' });
    const refreshToken = app.jwt.sign({ userId: user.id }, { expiresIn: '7d' });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const playerWithInstances = await prisma.player.findUnique({
      where: { id: user.player!.id },
      include: {
        characterInstances: {
          include: { character: true },
          orderBy: [{ character: { rarity: 'desc' } }, { level: 'desc' }],
        },
        currencies: true,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        guest: user.guest,
        player: playerWithInstances,
      },
    };
  });

  // Email/password registration
  app.post('/register', { schema: { body: registerSchema } }, async (request, reply) => {
    const { email, username, password } = request.body as {
      email?: string;
      username: string;
      password: string;
    };

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return reply.code(409).send({ error: 'conflict', message: 'Username or email already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        guest: false,
        player: {
          create: {
            name: username,
            currencies: {
              create: [
                { type: 'gold', amount: 1000 },
                { type: 'gems', amount: 50 },
                { type: 'stamina', amount: 100 },
              ],
            },
          },
        },
      },
      include: { player: true },
    });

    const accessToken = app.jwt.sign({ userId: user.id, playerId: user.player?.id }, { expiresIn: '15m' });
    const refreshToken = app.jwt.sign({ userId: user.id }, { expiresIn: '7d' });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        guest: user.guest,
        player: user.player,
      },
    };
  });

  // Refresh access token
  app.post('/refresh', { schema: { body: refreshSchema } }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return reply.code(401).send({ error: 'unauthorized', message: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId }, include: { player: true } });
    if (!user) return reply.code(404).send({ error: 'not_found', message: 'User not found' });

    const accessToken = app.jwt.sign({ userId: user.id, playerId: user.player?.id }, { expiresIn: '15m' });
    return { accessToken };
  });

  // Logout — revoke refresh token
  app.post('/logout', async (request, _reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = app.jwt.verify<{ userId: string }>(token);
        await prisma.refreshToken.deleteMany({ where: { userId: decoded.userId } });
      } catch {
        // ignore invalid token
      }
    }
    return { success: true };
  });
}

export default authRoutes;
