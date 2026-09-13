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
